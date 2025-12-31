import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Monitor {
  id: string;
  url: string;
  name: string;
  monitor_type: "http" | "keyword" | "port";
  expected_status: number;
  keyword: string | null;
  interval_sec: number;
  status: "up" | "down" | "paused" | "pending";
  user_id: string;
}

interface CheckResult {
  monitor_id: string;
  region: string;
  status: "up" | "down";
  response_ms: number;
  http_code: number | null;
}

interface CheckResultRow {
  status: string;
  response_ms: number;
}

const REGION = Deno.env.get("DENO_REGION") || "us-east-1";
const MAX_RETRIES = 3;
const TIMEOUT_MS = 30000;

async function checkMonitor(monitor: Monitor): Promise<CheckResult> {
  const startTime = Date.now();
  let httpCode: number | null = null;
  let isUp = false;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(monitor.url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent": "UptimePulse/1.0 (Uptime Monitor)",
        },
      });

      clearTimeout(timeoutId);
      httpCode = response.status;

      if (monitor.monitor_type === "http") {
        isUp = response.status === monitor.expected_status;
      } else if (monitor.monitor_type === "keyword" && monitor.keyword) {
        const text = await response.text();
        isUp = text.includes(monitor.keyword);
      } else {
        isUp = response.ok;
      }

      if (isUp) break;
    } catch (error) {
      console.log(`Attempt ${attempt + 1} failed for ${monitor.url}:`, error);
    }
  }

  const responseMs = Date.now() - startTime;

  return {
    monitor_id: monitor.id,
    region: REGION,
    status: isUp ? "up" : "down",
    response_ms: responseMs,
    http_code: httpCode,
  };
}

async function createAlertIfNeeded(
  supabase: any,
  monitor: Monitor,
  previousStatus: string,
  newStatus: string
) {
  // Only create alert if status changed from up to down or down to up
  if (previousStatus === newStatus) return;
  if (previousStatus === "paused" || previousStatus === "pending") return;
  if (newStatus === "paused" || newStatus === "pending") return;

  const isDown = newStatus === "down";
  const message = isDown
    ? `Monitor "${monitor.name}" is DOWN. URL: ${monitor.url}`
    : `Monitor "${monitor.name}" is back UP. URL: ${monitor.url}`;

  // Get user's integrations to determine alert channels
  const { data: integrations } = await supabase
    .from("integrations")
    .select("*")
    .eq("user_id", monitor.user_id)
    .single();

  const channels: string[] = [];
  if (integrations?.discord_webhook) channels.push("discord");
  if (integrations?.email_enabled) channels.push("email");
  if (integrations?.slack_webhook) channels.push("slack");
  if (integrations?.telegram_bot_key) channels.push("telegram");

  // Default to discord if no channels configured
  if (channels.length === 0) channels.push("discord");

  for (const channel of channels) {
    await supabase.from("alerts").insert({
      monitor_id: monitor.id,
      channel,
      message,
      success: true,
      delivered_at: new Date().toISOString(),
    });

    // Send Discord webhook if configured
    if (channel === "discord" && integrations?.discord_webhook) {
      try {
        const webhookUrl = integrations.discord_webhook as string;
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: message,
            embeds: [
              {
                title: isDown ? "🔴 Monitor Down" : "🟢 Monitor Up",
                description: message,
                color: isDown ? 15158332 : 3066993,
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        });
      } catch (error) {
        console.error("Failed to send Discord webhook:", error);
      }
    }
  }
}

async function updateMonitorStats(
  supabase: any,
  monitorId: string
) {
  // Calculate uptime percentage and average response time from last 24 hours
  const { data: results } = await supabase
    .from("check_results")
    .select("status, response_ms")
    .eq("monitor_id", monitorId)
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(100);

  if (!results || results.length === 0) return;

  const typedResults = results as CheckResultRow[];
  const upCount = typedResults.filter((r) => r.status === "up").length;
  const uptimePercentage = (upCount / typedResults.length) * 100;
  const avgResponseMs = Math.round(
    typedResults.reduce((sum, r) => sum + r.response_ms, 0) / typedResults.length
  );

  await supabase
    .from("monitors")
    .update({
      uptime_percentage: uptimePercentage,
      avg_response_ms: avgResponseMs,
    })
    .eq("id", monitorId);
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all monitors that need to be checked
    const now = new Date();
    const { data: monitors, error: monitorsError } = await supabase
      .from("monitors")
      .select("*")
      .neq("status", "paused");

    if (monitorsError) {
      console.error("Error fetching monitors:", monitorsError);
      throw monitorsError;
    }

    console.log(`Found ${monitors?.length || 0} monitors to check`);

    const results: CheckResult[] = [];

    for (const monitor of monitors || []) {
      // Check if it's time to check this monitor
      const lastChecked = monitor.last_checked
        ? new Date(monitor.last_checked)
        : null;
      const intervalMs = monitor.interval_sec * 1000;

      if (lastChecked && now.getTime() - lastChecked.getTime() < intervalMs) {
        console.log(`Skipping ${monitor.name}, not due yet`);
        continue;
      }

      console.log(`Checking monitor: ${monitor.name} (${monitor.url})`);

      const result = await checkMonitor(monitor as Monitor);
      results.push(result);

      // Insert check result
      const { error: insertError } = await supabase.from("check_results").insert({
        monitor_id: result.monitor_id,
        region: result.region,
        status: result.status,
        response_ms: result.response_ms,
        http_code: result.http_code,
      });

      if (insertError) {
        console.error("Error inserting check result:", insertError);
      }

      // Update monitor status and last_checked
      const previousStatus = monitor.status as string;
      const { error: updateError } = await supabase
        .from("monitors")
        .update({
          status: result.status,
          last_checked: now.toISOString(),
        })
        .eq("id", monitor.id);

      if (updateError) {
        console.error("Error updating monitor:", updateError);
      }

      // Create alert if status changed
      await createAlertIfNeeded(supabase, monitor as Monitor, previousStatus, result.status);

      // Update monitor stats
      await updateMonitorStats(supabase, monitor.id as string);
    }

    console.log(`Completed checking ${results.length} monitors`);

    return new Response(
      JSON.stringify({
        success: true,
        checked: results.length,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in check-monitors function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);

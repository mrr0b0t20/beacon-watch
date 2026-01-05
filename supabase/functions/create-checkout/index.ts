import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.log("Stripe not configured - returning demo mode response");
      return new Response(
        JSON.stringify({ 
          error: "Stripe not configured", 
          demo: true,
          message: "Payment system is in demo mode. Add STRIPE_SECRET_KEY to enable payments."
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Unauthorized");
    }

    const { priceId, planType } = await req.json();

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({
      email: userData.user.email,
      limit: 1,
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: userData.user.email,
        metadata: {
          supabase_user_id: userData.user.id,
        },
      });
      customerId = customer.id;
    }

    // Store customer ID in subscriptions table
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await serviceClient
      .from("subscriptions")
      .upsert({
        user_id: userData.user.id,
        stripe_customer_id: customerId,
      }, { onConflict: 'user_id' });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/settings?success=true`,
      cancel_url: `${req.headers.get("origin")}/settings?canceled=true`,
      metadata: {
        supabase_user_id: userData.user.id,
        plan_type: planType,
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
import { createClient } from "@supabase/supabase-js";

const supabase = createClient("https://gotothwfryivmhybasez.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvdG90aHdmcnlpdm1oeWJhc2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NTk4MDQsImV4cCI6MjA5NjUzNTgwNH0.2DUc-28j7tX08Vi41MeVmfxu9Fc8n3w5Vl7YBNVM1h0");

export { supabase };
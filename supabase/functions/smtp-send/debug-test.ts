// Quick debug script to check environment variables
console.log("=== SMTP Environment Variables Check ===");
console.log("SMTP_HOST:", Deno.env.get("SMTP_HOST") ? "✓ Set" : "✗ Missing");
console.log("SMTP_PORT:", Deno.env.get("SMTP_PORT") ? "✓ Set" : "✗ Missing");
console.log("SMTP_USERNAME:", Deno.env.get("SMTP_USERNAME") ? "✓ Set" : "✗ Missing");
console.log("SMTP_PASSWORD:", Deno.env.get("SMTP_PASSWORD") ? "✓ Set (length: " + (Deno.env.get("SMTP_PASSWORD") || "").length + ")" : "✗ Missing");
console.log("SMTP_FROM_EMAIL:", Deno.env.get("SMTP_FROM_EMAIL") ? "✓ Set" : "✗ Missing");
console.log("SMTP_FROM_NAME:", Deno.env.get("SMTP_FROM_NAME") ? "✓ Set" : "✗ Missing");
console.log("SMTP_SECURE:", Deno.env.get("SMTP_SECURE") || "not set");
console.log("ALLOWED_ORIGIN:", Deno.env.get("ALLOWED_ORIGIN") || "not set");
console.log("=====================================");

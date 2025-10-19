// Quick debug script to check environment variables
console.log("=== SMTP Environment Variables Check ===");
console.log("SMTP_HOST:", Deno.env.get("SMTP_HOST") !== undefined ? "✓ Set" : "✗ Missing");
console.log("SMTP_PORT:", Deno.env.get("SMTP_PORT") !== undefined ? "✓ Set" : "✗ Missing");
console.log("SMTP_USERNAME:", Deno.env.get("SMTP_USERNAME") !== undefined ? "✓ Set" : "✗ Missing");
// Cache password check to avoid multiple env calls and prevent leaking password length
const smtpPassword = Deno.env.get("SMTP_PASSWORD");
console.log("SMTP_PASSWORD:", smtpPassword !== undefined ? "✓ Set" : "✗ Missing");
console.log("SMTP_FROM_EMAIL:", Deno.env.get("SMTP_FROM_EMAIL") !== undefined ? "✓ Set" : "✗ Missing");
console.log("SMTP_FROM_NAME:", Deno.env.get("SMTP_FROM_NAME") !== undefined ? "✓ Set" : "✗ Missing");
console.log("SMTP_SECURE:", Deno.env.get("SMTP_SECURE") ?? "not set");
console.log("ALLOWED_ORIGIN:", Deno.env.get("ALLOWED_ORIGIN") ?? "not set");
console.log("=====================================");


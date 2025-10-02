import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import ChaiPaaniLogo from "figma:asset/ed44a61a321c772f05e626fe7aae98312671f4e9.png";
import ChaiPaaniLogoFull from "figma:asset/eae4acbb88aec2ceea0a68082bc9da850f60105a.png";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Phone, Loader2 } from "lucide-react";
import { authService } from "../lib/supabase-service";

interface AuthPageProps {
  onLogin: () => void;
  onBack: () => void;
  onLogoClick?: () => void;
}

export function AuthPage({ onLogin, onBack, onLogoClick }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data, error } = await authService.signIn(formData.email, formData.password);
        if (error) {
          setError(error.message);
        } else {
          console.log("Sign in successful:", data);
          onLogin();
        }
      } else {
        if (formData.password !== formData.confirmPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }

        const { data, error } = await authService.signUp(formData.email, formData.password, formData.name);
        if (error) {
          setError(error.message);
        } else {
          console.log("Sign up successful:", data);
          setError("Check your email for verification link!");
        }
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }

    setLoading(false);
  };

  const handleSocialLogin = async (provider: string) => {
    if (provider === "google") {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await authService.signInWithGoogle();
        if (error) {
          setError(error.message);
        } else {
          console.log("Google sign in initiated:", data);
          // The redirect will happen automatically to /auth/callback
          // But since we're using view-based routing, we need to handle this differently
          // The auth callback will be handled by Supabase's redirect
        }
      } catch (err) {
        setError("Failed to initiate Google sign in");
      }

      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-6 lg:gap-8 items-center">
        
        {/* Left Side - Branding */}
        <div className="hidden lg:block space-y-6 lg:space-y-8">
          <div className="space-y-6">
            <button 
              onClick={onLogoClick || onBack}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              {/* Mobile Logo */}
              <img 
                src={ChaiPaaniLogo} 
                alt="ChaiPaani Logo" 
                className="h-15 w-auto md:hidden"
              />
              {/* Desktop Logo */}
              <img 
                src={ChaiPaaniLogoFull} 
                alt="ChaiPaani Logo" 
                className="h-18 w-auto hidden md:block"
              />
            </button>
            
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-foreground leading-tight">
                <span className="text-primary">Sirf chai pe charcha,</span><br />
                <span className="text-secondary">hisaab pe nahi.</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Join thousands who have made expense splitting stress-free with ChaiPaani.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span>Split bills instantly with friends</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span>Track who owes what, settle up easily</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span>Keep relationships money-stress-free</span>
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">PR</span>
                </div>
                <div>
                  <p className="font-medium">Priya Sharma</p>
                  <p className="text-sm text-muted-foreground">College Student</p>
                </div>
              </div>
              <p className="text-muted-foreground italic">
                "ChaiPaani made our Goa trip so much easier! No more awkward money conversations with friends."
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="w-full max-w-md mx-auto">
          <Card className="border-0 shadow-lg lg:border lg:shadow-subtle">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2 mb-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={onBack}
                  className="p-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <span className="text-lg font-semibold">{isLogin ? "Welcome back!" : "Join ChaiPaani"}</span>
              </div>
              
              <CardTitle className="text-2xl">
                {isLogin ? "Log in to your account" : "Create your account"}
              </CardTitle>
              <p className="text-muted-foreground">
                {isLogin 
                  ? "Enter your credentials to access your account" 
                  : "Start splitting expenses with friends today"
                }
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error Display */}
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}

              {/* Social Login */}
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSocialLogin("google")}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Continue with Google
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or</span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required={!isLogin}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-10"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                </div>

                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        className="pl-10"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        required={!isLogin}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="pl-10 pr-10"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        className="pl-10"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                        required={!isLogin}
                      />
                    </div>
                  </div>
                )}

                {isLogin && (
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      <span className="text-muted-foreground">Remember me</span>
                    </label>
                    <Button variant="link" className="p-0 text-sm">
                      Forgot password?
                    </Button>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isLogin ? "Signing In..." : "Creating Account..."}
                    </>
                  ) : (
                    isLogin ? "Log In" : "Create Account"
                  )}
                </Button>
              </form>

              {/* Switch Form */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                  <Button 
                    variant="link" 
                    className="p-0 ml-1 font-semibold"
                    onClick={() => setIsLogin(!isLogin)}
                  >
                    {isLogin ? "Sign up" : "Log in"}
                  </Button>
                </p>
              </div>

              {/* Quick Demo */}
              <div className="border-t pt-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={onLogin}
                >
                  Continue with Demo Account
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Explore ChaiPaani without creating an account
                </p>
              </div>

              {/* Terms */}
              <p className="text-xs text-muted-foreground text-center">
                By continuing, you agree to our{" "}
                <a href="#" className="underline hover:text-foreground">Terms of Service</a>{" "}
                and{" "}
                <a href="#" className="underline hover:text-foreground">Privacy Policy</a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
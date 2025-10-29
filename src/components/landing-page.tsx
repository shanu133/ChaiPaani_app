import image_b5db5f5d96d176bece696628ff617915d1bbc7ad from '../assets/b5db5f5d96d176bece696628ff617915d1bbc7ad.png';
import image_d36983d55291d2aa07d6d41e4b6af5a1ee1115a9 from '../assets/d36983d55291d2aa07d6d41e4b6af5a1ee1115a9.png';
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import ChaiPaaniLogo from "../assets/ed44a61a321c772f05e626fe7aae98312671f4e9.png";
import ChaiPaaniLogoFull from "../assets/chaipaani_logo.png";
import { 
  Users, 
  Calculator, 
  Bell, 
  Smartphone, 
  Split, 
  IndianRupee,
  ArrowRight,
  Check,
  Star,
  Heart,
  Menu,
  X,
  Play,
  Shield,
  Zap,
  Globe
} from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [email, setEmail] = useState("");

  const features = [
    {
      icon: Split,
      title: "Smart Expense Splitting",
      description: "Automatically split bills among friends with customizable options - equally, by percentage, or exact amounts.",
    },
    {
      icon: Calculator,
      title: "Real-time Calculations",
      description: "See who owes what instantly. Our smart calculator handles complex splits and keeps everyone updated.",
    },
    {
      icon: Bell,
      title: "Gentle Reminders",
      description: "Friendly notifications help settle debts without awkward conversations. Keep relationships smooth.",
    },
    {
      icon: Smartphone,
      title: "Mobile First",
      description: "Add expenses on the go, snap receipts, and split costs instantly from your phone wherever you are.",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Bank-level encryption keeps your financial data safe. Your privacy is our top priority.",
    },
    {
      icon: Globe,
      title: "Multi-currency Support",
      description: "Split expenses in any currency when traveling abroad. Automatic conversion and fair rates.",
    }
  ];

  const steps = [
    {
      step: "1",
      title: "Create a Group",
      description: "Add your friends, family, or roommates to start tracking shared expenses together.",
      icon: Users
    },
    {
      step: "2", 
      title: "Add Expenses",
      description: "Snap a photo of the receipt or manually enter expenses. Choose how to split the cost.",
      icon: IndianRupee
    },
    {
      step: "3",
      title: "Settle Up",
      description: "See simplified debts and settle up with friends through UPI, bank transfer, or cash.",
      icon: Check
    }
  ];

  const testimonials = [
    {
      name: "Priya Sharma",
      role: "College Student",
      content: "ChaiPaani made our Goa trip so much easier! No more awkward money conversations with friends.",
      avatar: "PS",
      rating: 5
    },
    {
      name: "Rahul Kumar",
      role: "Software Engineer",
      content: "Finally, a simple way to split bills with roommates. Love the Hindi touch - feels so Indian!",
      avatar: "RK", 
      rating: 5
    },
    {
      name: "Anita Patel",
      role: "Marketing Manager",
      content: "The gentle reminders feature is perfect. No more forgetting who owes what in our office group.",
      avatar: "AP",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
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

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">Reviews</a>
              <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-4">
              <Button variant="ghost" onClick={onGetStarted}>
                Login
              </Button>
              <Button onClick={onGetStarted}>
                Get Started
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden border-t py-4 space-y-4">
              <a href="#features" className="block text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="block text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
              <a href="#testimonials" className="block text-muted-foreground hover:text-foreground transition-colors">Reviews</a>
              <a href="#about" className="block text-muted-foreground hover:text-foreground transition-colors">About</a>
              <div className="flex flex-col gap-2 pt-4">
                <Button variant="ghost" onClick={onGetStarted} className="w-full">
                  Login
                </Button>
                <Button onClick={onGetStarted} className="w-full">
                  Get Started
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-12 md:py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-6 md:space-y-8 text-center lg:text-left">
              <div className="space-y-4">
                <Badge variant="secondary" className="w-fit mx-auto lg:mx-0 font-bold font-normal font-[Poppins]">
                  <Zap className="w-4 h-4 mr-2" />
                  Now in Beta
                </Badge>
                <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight">
                  <span className="text-primary not-italic font-bold">Sirf chai pe charcha,</span><br />
                  <span className="text-secondary">hisaab pe nahi.</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0">
                  Split expenses effortlessly with friends and family. Track who owes what, settle up with ease, and keep relationships money-stress-free.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center lg:justify-start">
                <Button size="lg" onClick={onGetStarted} className="text-base md:text-lg px-6 md:px-8 py-3 md:py-4">
                  Start Splitting
                  <ArrowRight className="w-4 md:w-5 h-4 md:h-5 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-base md:text-lg px-6 md:px-8 py-3 md:py-4"
                  onClick={() => {
                    // Open demo video in new tab
                    window.open("https://www.youtube.com/watch?v=oHg5SJYRHA0", "_blank");
                  }}
                >
                  <Play className="w-4 md:w-5 h-4 md:h-5 mr-2" />
                  Watch Demo
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 sm:gap-6 md:gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>Free to use</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>No hidden fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>Secure & private</span>
                </div>
              </div>
            </div>

            <div className="relative">
              {/* Main App Mockup */}
              <div className="relative z-10">
                <Card className="transform rotate-2 shadow-2xl hover:rotate-1 transition-transform duration-300">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Weekend Gang
                      </CardTitle>
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        4 members
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-green-50 to-green-100 border border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                          <span className="text-white text-sm">🍕</span>
                        </div>
                        <div>
                          <p className="font-medium">Pizza Party</p>
                          <p className="text-sm text-muted-foreground">Paid by Rahul</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹1,600</p>
                        <p className="text-sm text-green-600">+₹400 for you</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                          <span className="text-white text-sm">🎬</span>
                        </div>
                        <div>
                          <p className="font-medium">Movie Tickets</p>
                          <p className="text-sm text-muted-foreground">You paid</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹800</p>
                        <p className="text-sm text-orange-600">-₹200 from others</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Net Balance</span>
                        <span className="font-bold text-xl text-primary">+₹200</span>
                      </div>
                      <Button className="w-full mt-3" size="sm">
                        <IndianRupee className="w-4 h-4 mr-2" />
                        Settle Up
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Floating Balance Card */}
              <div className="absolute -top-6 -right-6 z-20">
                <Card className="transform -rotate-12 shadow-lg hover:-rotate-6 transition-transform duration-300 bg-gradient-to-br from-secondary to-secondary/80 text-white border-0">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm opacity-90">Total Saved</p>
                      <p className="text-2xl font-bold">₹12,450</p>
                      <p className="text-xs opacity-75">This month</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Background Gradient */}
              <div className="absolute -top-8 -left-8 w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl transform -rotate-6 blur-sm"></div>
              
              {/* Decorative Elements */}
              <div className="absolute -bottom-4 -left-6 w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg z-10">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -top-2 left-1/3 w-4 h-4 bg-secondary rounded-full animate-pulse"></div>
              <div className="absolute -bottom-2 right-1/4 w-3 h-3 bg-primary/60 rounded-full animate-pulse delay-1000"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 md:py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 md:space-y-4 mb-12 md:mb-16">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
              Everything you need to split expenses
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              From quick coffee runs to elaborate vacation planning, ChaiPaani makes splitting expenses simple and stress-free.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className={`p-4 md:p-6 hover:shadow-lg transition-all hover:-translate-y-1 ${
                  index % 3 === 0 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20' :
                  index % 3 === 1 ? 'bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20' :
                  'bg-gradient-to-br from-muted/30 to-muted/50 border-muted-foreground/20'
                }`}>
                  <div className="space-y-3 md:space-y-4">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center ${
                      index % 3 === 0 ? 'bg-primary/15' :
                      index % 3 === 1 ? 'bg-secondary/15' :
                      'bg-muted-foreground/15'
                    }`}>
                      <Icon className={`w-5 h-5 md:w-6 md:h-6 ${
                        index % 3 === 0 ? 'text-primary' :
                        index % 3 === 1 ? 'text-secondary' :
                        'text-foreground'
                      }`} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-base md:text-lg font-semibold text-foreground">{feature.title}</h3>
                      <p className="text-sm md:text-base text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-[rgba(44,62,80,1)]">
              How ChaiPaani Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Get started in minutes. It's as easy as sharing chai with friends.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="text-center space-y-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Icon className="w-10 h-10 text-primary" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
                      {step.step}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <Button size="lg" onClick={onGetStarted} className="text-lg px-8 py-4">
              Try it yourself
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              Loved by thousands across India
            </h2>
            <p className="text-xl text-muted-foreground">
              See what our users are saying about their ChaiPaani experience.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6">
                <div className="space-y-4">
                  <div className="flex gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground italic">"{testimonial.content}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">{testimonial.avatar}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-8 lg:p-12 text-center bg-gradient-to-br from-primary/5 to-secondary/5">
            <div className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
                  Stay updated with ChaiPaani
                </h2>
                <p className="text-xl text-muted-foreground">
                  Get the latest features, tips, and exclusive content delivered to your inbox.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={() => {
                    console.log("Newsletter signup:", email);
                    setEmail("");
                  }}
                >
                  Subscribe
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                No spam, unsubscribe anytime. We respect your privacy.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
                  About ChaiPaani
                </h2>
                <p className="text-xl text-muted-foreground">
                  Born from the simple idea that money should never come between good relationships. 
                  We're making expense splitting as natural as sharing chai with friends.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Heart className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Built for Indian Culture</h3>
                    <p className="text-muted-foreground">Understanding how Indians share money, from street food to family dinners, we've built ChaiPaani with cultural sensitivity at its core.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Community First</h3>
                    <p className="text-muted-foreground">Every feature is designed to strengthen relationships, not strain them. We believe technology should bring people closer together.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Privacy & Security</h3>
                    <p className="text-muted-foreground">Your financial data is encrypted and secure. We never share your information with third parties, and you're always in control.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <ImageWithFallback 
                src={image_b5db5f5d96d176bece696628ff617915d1bbc7ad} 
                alt="Team collaboration" 
                className="rounded-lg shadow-2xl w-4/5"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <img 
                  src={ChaiPaaniLogoFull} 
                  alt="ChaiPaani Logo" 
                  className="h-18 w-auto"
                />
              </button>
              <p className="text-sm text-muted-foreground">
                Making expense splitting as natural as sharing chai with friends.
              </p>
              <p className="text-sm text-muted-foreground">
                Built with ❤️ in India
              </p>
              <p className="text-xs text-muted-foreground">
                © 2025 ChaiPaani. All rights reserved.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Product</h3>
              <div className="space-y-2 text-sm">
                <a href="#features" className="block text-muted-foreground hover:text-foreground transition-colors">Features</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Mobile App</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">API</a>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Company</h3>
              <div className="space-y-2 text-sm">
                <a href="#about" className="block text-muted-foreground hover:text-foreground transition-colors">About</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Blog</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Careers</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Contact</a>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Support</h3>
              <div className="space-y-2 text-sm">
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Help Center</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Status</a>
              </div>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground">
              © 2024 ChaiPaani. All rights reserved.
            </p>
            <div className="flex items-center gap-4 mt-4 sm:mt-0">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <span className="sr-only">LinkedIn</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

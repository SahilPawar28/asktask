import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, Clock, MapPin, Shield, Star, Zap } from "lucide-react";

const steps = [
  { icon: "📝", title: "Post a Task", description: "Describe what you need done, set a price, and post it." },
  { icon: "🙋", title: "Someone Accepts", description: "Nearby task doers see your task and accept it." },
  { icon: "✅", title: "Task Completed", description: "Get it done, verify, and release payment. Simple!" },
];

const stats = [
  { value: "10K+", label: "Tasks Completed" },
  { value: "5K+", label: "Active Users" },
  { value: "4.8", label: "Avg Rating" },
  { value: "₹50L+", label: "Paid Out" },
];

const categories = [
  { icon: "📦", label: "Delivery", count: "2.4k tasks" },
  { icon: "🛒", label: "Shopping", count: "1.8k tasks" },
  { icon: "🍔", label: "Food & Drinks", count: "1.1k tasks" },
  { icon: "📚", label: "Tutoring", count: "950 tasks" },
  { icon: "💻", label: "Tech Help", count: "1.2k tasks" },
  { icon: "🧹", label: "Cleaning", count: "1.5k tasks" },
  { icon: "🔧", label: "Repairs", count: "870 tasks" },
  { icon: "🚛", label: "Moving", count: "800 tasks" },
  { icon: "🐾", label: "Pet Care", count: "620 tasks" },
  { icon: "🏃", label: "Errands", count: "1.3k tasks" },
  { icon: "✨", label: "Other", count: "500+ tasks" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <Badge variant="category" className="mb-6 px-4 py-1.5 text-sm">
              <Zap className="h-3.5 w-3.5 mr-1" /> Now live in 15+ cities
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold font-display leading-tight">
              Get Anything Done.{" "}
              <span className="text-gradient">Or Earn By Helping.</span>
            </h1>
            <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
              Post tasks or complete tasks nearby and earn money. From deliveries to tech help — the micro task marketplace for everyone.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              <Link to="/post-task">
                <Button variant="hero" size="xl">
                  Post a Task <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="hero-outline" size="xl">
                  Find Tasks
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-2xl mx-auto">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="text-center"
                >
                  <p className="text-3xl font-bold font-display text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-secondary/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold font-display text-foreground">How It Works</h2>
            <p className="mt-3 text-lg text-muted-foreground">Three simple steps to get started</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative bg-card rounded-2xl p-8 shadow-task-card text-center group hover:shadow-task-card-hover transition-all"
              >
                <div className="text-5xl mb-4">{step.icon}</div>
                <div className="absolute top-4 right-4 w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                  {i + 1}
                </div>
                <h3 className="text-xl font-bold font-display text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold font-display text-foreground">Popular Categories</h2>
            <p className="mt-3 text-lg text-muted-foreground">Find tasks in every category</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.05 }}
                className="bg-card rounded-2xl p-6 text-center shadow-task-card hover:shadow-task-card-hover transition-all cursor-pointer border border-border"
              >
                <div className="text-4xl mb-3">{cat.icon}</div>
                <p className="font-semibold font-display text-foreground">{cat.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{cat.count}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-20 bg-secondary/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: "Secure Payments", desc: "Escrow-based payments. Your money is safe until you verify completion." },
              { icon: Star, title: "Rated Community", desc: "Every user is rated. See reviews before accepting or posting tasks." },
              { icon: CheckCircle, title: "Verified Users", desc: "Phone-verified users with identity badges for extra trust." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-4 p-6 bg-card rounded-2xl shadow-task-card"
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                  <item.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-bold font-display text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="gradient-primary rounded-3xl p-12 md:p-16 shadow-elevated"
          >
            <h2 className="text-3xl md:text-5xl font-bold font-display text-primary-foreground mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
              Join thousands of people who are getting things done and earning money in their neighborhood.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/dashboard">
                <Button variant="secondary" size="xl">
                  Start Now — It's Free
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden">
                <img src="/AskTaskLogo.png" alt="AskTask" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold font-display text-foreground">AskTask</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2026 AskTask. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

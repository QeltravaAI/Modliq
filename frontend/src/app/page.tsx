"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import Image from "next/image";
import {
  BrainCircuit,
  Lock,
  ArrowRight,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import AuthModal from "@/components/auth/AuthModal";
import { useSession } from "next-auth/react";

export default function HomeOrLandingPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const { data: session, status } = useSession();

  const landingRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    if (status === "authenticated" && session?.user?.id) {
      router.push(`/${session.user.id}/modliq-console/dashboard`);
    }
  }, [router, status, session]);

  // ── GSAP Landing animations ────────────────
  useGSAP(() => {
    if (isMounted) {
      gsap.from(".hero-el", {
        opacity: 0,
        y: 25,
        stagger: 0.15,
        duration: 0.8,
        ease: "power3.out",
      });
    }
  }, { scope: landingRef, dependencies: [isMounted] });

  // ── GSAP Modal animation ──────────────────
  useGSAP(() => {
    if (showLoginModal && modalRef.current) {
      gsap.fromTo(modalRef.current,
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.5)" }
      );
    }
  }, [showLoginModal]);

  const handleDemoAccess = () => {
    setShowLoginModal(true);
  };

  if (!isMounted) return null;

  // ─────────────────────────────────────────────
  // 1. LANDING PAGE VIEW
  // ─────────────────────────────────────────────
  return (
      <div className="bg-white text-[#1B2A4A] min-h-screen selection:bg-[#2B70AB] selection:text-white font-sans scroll-smooth" ref={landingRef}>
        {/* Navigation Bar */}
        <header className="border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-50 transition-all">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-bg.png"
                alt="Modliq Logo"
                width={36}
                height={36}
                className="rounded-xl object-contain border border-gray-100 shadow-sm"
              />
              <div>
                <span className="text-xl font-bold tracking-tight text-[#1B2A4A] block">MODLIQ</span>
                <span className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase block">AI Quality Copilot</span>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
              <a href="#problem" className="hover:text-[#1B2A4A] transition">Problem</a>
              <a href="#solution" className="hover:text-[#1B2A4A] transition">Solution</a>
              <a href="#engines" className="hover:text-[#1B2A4A] transition">Engines</a>
              <a href="#workflow" className="hover:text-[#1B2A4A] transition">Workflow</a>
              <a href="#comparison" className="hover:text-[#1B2A4A] transition">Comparison</a>
              <a href="#faq" className="hover:text-[#1B2A4A] transition">FAQ</a>
            </nav>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-sm font-medium hover:text-[#1B2A4A] transition text-gray-500"
              >
                Sign In
              </button>
              <button
                onClick={handleDemoAccess}
                className="bg-[#2B70AB] hover:bg-[#1B2A4A] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition shadow-md shadow-[#2B70AB]/20"
              >
                Launch Demo
              </button>
            </div>
          </div>
        </header>

        {/* 1. Hero Section */}
        <section className="relative pt-28 pb-24 overflow-hidden border-b border-gray-100 bg-gradient-to-b from-[#F0F6FA] to-white">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_100%,#000_70%,transparent_100%)] opacity-40" />
          <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
            <span className="hero-el inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F0F6FA] border border-[#2B70AB]/30 text-[#2B70AB] text-xs font-semibold uppercase tracking-wider mb-8">
              <BrainCircuit size={12} className="text-[#2B70AB]" /> AI Quality &amp; Process Intelligence Platform
            </span>
            <h1 className="hero-el text-4xl sm:text-6xl font-extrabold text-[#1B2A4A] tracking-tight leading-[1.1] mb-6 max-w-4xl mx-auto">
              From production data to <span className="text-[#2B70AB]">better process decisions</span> — in minutes.
            </h1>
            <p className="hero-el text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
              Modliq combines AI-powered yield optimization with quality engineering tools like control charts, capability studies, and AQL sampling. Upload your CSV, describe your goal, and get recommended operating settings, business impact, process stability checks, and a trial SOP — without writing code or choosing algorithms.
            </p>
            <div className="hero-el flex flex-wrap justify-center gap-4">
              <button
                onClick={handleDemoAccess}
                className="bg-[#2B70AB] hover:bg-[#1B2A4A] text-white text-base font-semibold px-8 py-3.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-[#2B70AB]/20 hover:scale-[1.02]"
              >
                Run Manufacturing Demo Free <ArrowRight size={18} />
              </button>
              <button
                onClick={() => setShowLoginModal(true)}
                className="bg-[#F0F6FA] hover:bg-gray-100 text-[#1B2A4A] text-base font-semibold px-8 py-3.5 rounded-xl transition border border-[#D0E2F0] flex items-center gap-2 hover:scale-[1.02]"
              >
                <Lock size={16} /> Sign In
              </button>
            </div>
            <p className="hero-el text-xs text-gray-500 mt-6 font-mono">
              Built for manufacturing, engineering, and quality teams. No data science degree required.
            </p>
          </div>
        </section>

        {/* 2. Problem Section */}
        <section id="problem" className="py-24 border-b border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold text-[#2B70AB] uppercase tracking-widest block mb-2">The problem with traditional quality tools</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1B2A4A] leading-tight">Your data sits in spreadsheets. Your process decisions are still manual.</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-[#F0F6FA] border border-[#D0E2F0] rounded-3xl p-8 hover:shadow-md transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#D0E2F0] flex items-center justify-center text-[#2B70AB] mb-6 text-xl">⚙️</div>
                <h3 className="text-lg font-bold text-[#1B2A4A] mb-3">Too Complex</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Enterprise AI and AutoML platforms are powerful, but often too broad, expensive, and technical for SME factory teams.
                </p>
              </div>

              <div className="bg-[#F0F6FA] border border-[#D0E2F0] rounded-3xl p-8 hover:shadow-md transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#D0E2F0] flex items-center justify-center text-[#2B70AB] mb-6 text-xl">⏳</div>
                <h3 className="text-lg font-bold text-[#1B2A4A] mb-3">Too Slow</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Running manual analysis, checking quality variation, and preparing SOP updates can take days or weeks of manual engineering hours.
                </p>
              </div>

              <div className="bg-[#F0F6FA] border border-[#D0E2F0] rounded-3xl p-8 hover:shadow-md transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#D0E2F0] flex items-center justify-center text-[#2B70AB] mb-6 text-xl">🔌</div>
                <h3 className="text-lg font-bold text-[#1B2A4A] mb-3">Too Disconnected</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Yield optimization, SPC charts, Cpk studies, sampling plans, and SOP updates usually happen in different tools. Modliq connects them into one workflow.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Solution Section */}
        <section id="solution" className="py-24 border-b border-gray-100 bg-[#F0F6FA]/30">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold text-[#2B70AB] uppercase tracking-widest block mb-2">One Platform. Two Engines.</span>
              <h2 className="text-4xl font-extrabold text-[#1B2A4A]">Optimize. Validate. Act.</h2>
              <p className="text-gray-600 mt-4 leading-relaxed">
                Modliq brings AI process optimization and classical quality engineering into one unified workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Engine 1 */}
              <div className="bg-white border border-[#D0E2F0] rounded-3xl p-8 flex flex-col justify-between hover:shadow-md transition-all duration-300">
                <div>
                  <div className="inline-flex px-3 py-1 rounded-full bg-[#F0F6FA] border border-[#2B70AB]/20 text-[#2B70AB] text-xs font-semibold uppercase tracking-wider mb-6">
                    Engine 1
                  </div>
                  <h3 className="text-xl font-bold text-[#1B2A4A] mb-3">Yield Optimizer</h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-6">
                    Find recommended operating settings from your production data. Describe optimization goals in plain English, and have Modliq detect target metrics and constraints.
                  </p>
                </div>
                <div className="border-t border-gray-100 pt-4 flex items-center justify-between text-xs text-[#2B70AB] font-mono">
                  <span>AI Parameter Tuning</span>
                  <span>Active</span>
                </div>
              </div>

              {/* Engine 2 */}
              <div className="bg-white border border-[#D0E2F0] rounded-3xl p-8 flex flex-col justify-between hover:shadow-md transition-all duration-300">
                <div>
                  <div className="inline-flex px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold uppercase tracking-wider mb-6">
                    Engine 2
                  </div>
                  <h3 className="text-xl font-bold text-[#1B2A4A] mb-3">Quality Studio</h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-6">
                    Validate process stability and capability before applying changes. Generate I-MR charts, p-charts, c-charts, Cp/Cpk studies, and AQL acceptance sampling checks.
                  </p>
                </div>
                <div className="border-t border-gray-100 pt-4 flex items-center justify-between text-xs text-indigo-600 font-mono">
                  <span>SPC &amp; Capability</span>
                  <span>Active</span>
                </div>
              </div>

              {/* Output */}
              <div className="bg-white border border-[#D0E2F0] rounded-3xl p-8 flex flex-col justify-between hover:shadow-md transition-all duration-300">
                <div>
                  <div className="inline-flex px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-semibold uppercase tracking-wider mb-6">
                    Unified Output
                  </div>
                  <h3 className="text-xl font-bold text-[#1B2A4A] mb-3">Trial SOP &amp; Plan</h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-6">
                    Get a trial plan and SOP-ready recommendation your team can use safely. Modliq generates a 7-batch validation plan with supervisor checklists and ROI projections.
                  </p>
                </div>
                <div className="border-t border-gray-100 pt-4 flex items-center justify-between text-xs text-emerald-600 font-mono">
                  <span>Actionable trial plans</span>
                  <span>Active</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Features - Yield Optimizer */}
        <section id="engines" className="py-24 border-b border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-5">
                <span className="text-xs font-bold text-[#2B70AB] uppercase tracking-widest block mb-2">Engine 1 Features</span>
                <h2 className="text-3xl sm:text-4xl font-bold text-[#1B2A4A] mb-6">Yield Optimizer</h2>
                <p className="text-gray-600 text-sm leading-relaxed mb-6">
                  Find better process settings directly from historical CSV data. Skip formatting, selecting models, or writing Python scripts.
                </p>

                <div className="space-y-4 font-sans text-sm">
                  <div className="flex gap-3">
                    <span className="text-[#2B70AB] font-bold">✓</span>
                    <div>
                      <h4 className="text-[#1B2A4A] font-semibold">Natural-Language Goal Detection</h4>
                      <p className="text-gray-500 mt-1 text-xs">Modliq extracts target metrics, thresholds, and limits automatically.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[#2B70AB] font-bold">✓</span>
                    <div>
                      <h4 className="text-[#1B2A4A] font-semibold">Target Setting + Safe Trial Ranges</h4>
                      <p className="text-gray-500 mt-1 text-xs">Provides exact targets alongside validation margins to protect operations.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[#2B70AB] font-bold">✓</span>
                    <div>
                      <h4 className="text-[#1B2A4A] font-semibold">Business Impact &amp; ROI Predictions</h4>
                      <p className="text-gray-500 mt-1 text-xs">Estimates savings ranges and unit yield increases to support decision-making.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 bg-[#F0F6FA] border border-[#D0E2F0] rounded-3xl p-8 relative overflow-hidden shadow-sm">
                <div className="flex items-center justify-between border-b border-[#D0E2F0] pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <span className="text-xs font-mono text-gray-400">Yield Optimizer Demo View</span>
                </div>

                <div className="space-y-6">
                  {/* Goal Input Mockup */}
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Natural-Language Input</span>
                    <div className="bg-white border border-[#D0E2F0] rounded-xl p-4 text-sm text-gray-800 font-mono flex justify-between items-center shadow-sm">
                      <span>“Maximize yield above 95% while keeping temperature below 90°C.”</span>
                      <span className="text-xs bg-[#F0F6FA] text-[#2B70AB] px-2 py-0.5 rounded border border-[#2B70AB]/20">Parsed</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 font-mono text-[10px] text-gray-400">
                      <div>Target: <span className="text-[#1B2A4A] font-semibold">Yield</span></div>
                      <div>Goal: <span className="text-[#1B2A4A] font-semibold">Maximize</span></div>
                      <div>Threshold: <span className="text-[#1B2A4A] font-semibold">95%</span></div>
                      <div>Limit: <span className="text-[#1B2A4A] font-semibold">Temp &lt; 90°C</span></div>
                    </div>
                  </div>

                  {/* Settings Mockup */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white border border-[#D0E2F0] rounded-xl p-4 shadow-sm">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Recommended Targets</span>
                      <div className="space-y-1 font-mono text-sm mt-2 text-[#1B2A4A]">
                        <div>Temperature: <span className="text-[#2B70AB] font-bold">87.5°C</span></div>
                        <div>Pressure: <span className="text-[#2B70AB] font-bold">450 kPa</span></div>
                      </div>
                    </div>

                    <div className="bg-white border border-[#D0E2F0] rounded-xl p-4 shadow-sm">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Recommended Trial Range</span>
                      <div className="space-y-1 font-mono text-sm mt-2 text-[#1B2A4A]">
                        <div>Temperature: <span className="text-[#2B70AB] font-bold">86.5–88.5°C</span></div>
                        <div>Pressure: <span className="text-[#2B70AB] font-bold">440–460 kPa</span></div>
                      </div>
                    </div>
                  </div>

                  {/* ROI Mockup */}
                  <div className="bg-white border border-[#D0E2F0] rounded-xl p-4 shadow-sm">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">ROI Impact Projection</span>
                    <div className="grid grid-cols-3 gap-2 font-mono text-center">
                      <div className="bg-[#F0F6FA] p-2 rounded border border-[#D0E2F0]">
                        <div className="text-[10px] text-gray-500">Projected Yield</div>
                        <div className="text-sm font-bold text-green-600 mt-1">96.8%</div>
                      </div>
                      <div className="bg-[#F0F6FA] p-2 rounded border border-[#D0E2F0]">
                        <div className="text-[10px] text-gray-500">Savings / Mo</div>
                        <div className="text-sm font-bold text-blue-600 mt-1">₹1.6L–₹2.1L</div>
                      </div>
                      <div className="bg-[#F0F6FA] p-2 rounded border border-[#D0E2F0]">
                        <div className="text-[10px] text-gray-500">Payback Period</div>
                        <div className="text-sm font-bold text-purple-600 mt-1">9 Days</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Features - Quality Studio */}
        <section className="py-24 border-b border-gray-100 bg-[#F0F6FA]/20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 bg-[#F0F6FA] border border-[#D0E2F0] rounded-3xl p-8 order-last lg:order-first shadow-sm">
                <div className="flex items-center justify-between border-b border-[#D0E2F0] pb-4 mb-6">
                  <div className="flex gap-2">
                    <span className="px-2 py-1 rounded bg-white border border-[#D0E2F0] text-[#2B70AB] text-[10px] font-mono font-semibold">Stability Check</span>
                    <span className="px-2 py-1 rounded bg-white border border-[#D0E2F0] text-[#2B70AB] text-[10px] font-mono font-semibold">Cp/Cpk Index</span>
                    <span className="px-2 py-1 rounded bg-white border border-[#D0E2F0] text-[#2B70AB] text-[10px] font-mono font-semibold">AQL Sample size</span>
                  </div>
                  <span className="text-xs font-mono text-gray-400">Quality Studio Analysis</span>
                </div>

                <div className="space-y-6">
                  {/* Validation questions */}
                  <div className="bg-white border border-[#D0E2F0] rounded-xl p-4 shadow-sm">
                    <span className="text-xs font-semibold text-[#2B70AB] uppercase tracking-wider block mb-2">Core Quality Inquiries</span>
                    <ul className="space-y-1.5 text-xs text-gray-600 list-disc pl-4 font-mono">
                      <li>Is my production process currently stable?</li>
                      <li>Can my process reliably meet engineering specifications?</li>
                      <li>Which historical points are outliers?</li>
                      <li>How many units must I inspect to reject/accept a lot?</li>
                    </ul>
                  </div>

                  {/* Modules */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="bg-white border border-[#D0E2F0] rounded-xl p-4 shadow-sm">
                      <span className="font-semibold text-[#1B2A4A] block mb-1">Control Charts (SPC)</span>
                      <p className="text-gray-500 text-[10px] leading-relaxed">
                        I-MR Chart (Variable), p-Chart (Defect Rate), and c-Chart (Defect Count) dynamically compiled.
                      </p>
                    </div>

                    <div className="bg-white border border-[#D0E2F0] rounded-xl p-4 shadow-sm">
                      <span className="font-semibold text-[#1B2A4A] block mb-1">Capability Study (Cp/Cpk)</span>
                      <div className="space-y-1 mt-1.5 text-[10px] text-gray-600">
                        <div>Cp / Cpk: <span className="text-[#2B70AB] font-bold">1.41 / 1.35</span></div>
                        <div>Sigma Level: <span className="text-[#2B70AB] font-bold">4.1σ</span></div>
                        <div>Status: <span className="text-green-600 font-semibold">Capable</span></div>
                      </div>
                    </div>

                    <div className="bg-white border border-[#D0E2F0] rounded-xl p-4 shadow-sm">
                      <span className="font-semibold text-[#1B2A4A] block mb-1">Quality Descriptive Summary</span>
                      <p className="text-gray-500 text-[10px] leading-relaxed">
                        Mean, Standard Deviation, Skewness, Range, and automatic IQR-based outlier alerts.
                      </p>
                    </div>

                    <div className="bg-white border border-[#D0E2F0] rounded-xl p-4 shadow-sm">
                      <span className="font-semibold text-[#1B2A4A] block mb-1">Acceptance Sampling</span>
                      <div className="space-y-1 mt-1.5 text-[10px] text-gray-600">
                        <div>Lot Size: 10,000 | AQL: 1.5%</div>
                        <div>Sample Size: <span className="text-[#2B70AB] font-bold">125 units</span></div>
                        <div>Ac / Re: <span className="text-[#2B70AB] font-bold">5 / 6 defects</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <span className="text-xs font-bold text-[#2B70AB] uppercase tracking-widest block mb-2">Engine 2 Features</span>
                <h2 className="text-3xl sm:text-4xl font-bold text-[#1B2A4A] mb-6">Quality Studio</h2>
                <p className="text-gray-600 text-sm leading-relaxed mb-6">
                  Validate process stability before modifying any settings. Run classical Quality Control checks inside deterministic local engines.
                </p>

                <div className="space-y-4 text-sm font-sans">
                  <div className="flex gap-3">
                    <span className="text-[#2B70AB] font-bold">✓</span>
                    <div>
                      <h4 className="text-[#1B2A4A] font-semibold">Deterministic Control Charts</h4>
                      <p className="text-gray-500 mt-1 text-xs">Instantly build I-MR, p-Charts, and c-Charts without excel macros.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[#2B70AB] font-bold">✓</span>
                    <div>
                      <h4 className="text-[#1B2A4A] font-semibold">Process Capability (Cp/Cpk)</h4>
                      <p className="text-gray-500 mt-1 text-xs">Input specifications limits and evaluate sigma performance.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[#2B70AB] font-bold">✓</span>
                    <div>
                      <h4 className="text-[#1B2A4A] font-semibold">AQL Inspection Planning</h4>
                      <p className="text-gray-500 mt-1 text-xs">Standardized military inspection level calculations for lot release decisions.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. 5-Minute Workflow Section */}
        <section id="workflow" className="py-24 border-b border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold text-[#2B70AB] uppercase tracking-widest block mb-2">Workflow</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1B2A4A]">The 5-Minute Decision Cycle</h2>
              <p className="text-gray-600 mt-4 text-sm leading-relaxed">
                Modliq simplifies data analysis, validation, and documentation into a structured path.
              </p>
            </div>

            <div className="relative flex flex-col md:flex-row md:justify-between items-center gap-8 md:gap-4 md:before:absolute md:before:top-1/2 md:before:left-12 md:before:right-12 md:before:h-0.5 md:before:bg-gray-100 md:before:-z-10">
              {[
                { step: "01", title: "Upload CSV", desc: "Select and preview your production CSV or excel logs." },
                { step: "02", title: "Describe Goal", desc: "Describe target yield and machine constraints in plain English." },
                { step: "03", title: "Get Settings", desc: "View recommended target settings and trial operating bounds." },
                { step: "04", title: "Validate QC", desc: "Run stability charts and capability calculations." },
                { step: "05", title: "Download SOP", desc: "Export a ready 7-batch trial plan and supervisor checklist." }
              ].map((w, idx) => (
                <div key={idx} className="bg-[#F0F6FA] border border-[#D0E2F0] rounded-3xl p-6 text-center max-w-xs relative hover:shadow-md transition-all duration-300 z-10">
                  <div className="w-10 h-10 rounded-full bg-white border border-[#2B70AB]/30 text-[#2B70AB] flex items-center justify-center font-mono font-bold text-sm mx-auto mb-4">
                    {w.step}
                  </div>
                  <h3 className="font-bold text-[#1B2A4A] mb-2">{w.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{w.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. Who it is for */}
        <section className="py-24 border-b border-gray-100 bg-[#F0F6FA]/10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold text-[#2B70AB] uppercase tracking-widest block mb-2">Designed For Teams</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1B2A4A]">Who Benefits from Modliq?</h2>
              <p className="text-gray-600 mt-4 text-sm leading-relaxed">
                Modliq is engineered to bridge process knowledge and analytical science without complex code.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-white border border-[#D0E2F0] rounded-3xl p-6 hover:shadow-md transition-all duration-300">
                <h4 className="text-lg font-bold text-[#1B2A4A] mb-2">Quality Engineers</h4>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Automate tedious SPC charts, outlier removal, capability studies (Cpk), and AQL lot sizing in seconds.
                </p>
              </div>

              <div className="bg-white border border-[#D0E2F0] rounded-3xl p-6 hover:shadow-md transition-all duration-300">
                <h4 className="text-lg font-bold text-[#1B2A4A] mb-2">Process Engineers</h4>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Extract optimal target set-points, define safe operational envelopes, and discover main process drivers.
                </p>
              </div>

              <div className="bg-white border border-[#D0E2F0] rounded-3xl p-6 hover:shadow-md transition-all duration-300">
                <h4 className="text-lg font-bold text-[#1B2A4A] mb-2">Plant Managers</h4>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Improve line yields, identify capacity improvements, reduce scrap, and review ROI summaries.
                </p>
              </div>

              <div className="bg-white border border-[#D0E2F0] rounded-3xl p-6 hover:shadow-md transition-all duration-300">
                <h4 className="text-lg font-bold text-[#1B2A4A] mb-2">SME Owners &amp; Leadership</h4>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Leverage machine learning yield optimization without hiring expensive, specialized data science teams.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Comparison Section */}
        <section id="comparison" className="py-24 border-b border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold text-[#2B70AB] uppercase tracking-widest block mb-2">Product Comparison</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1B2A4A]">How Modliq Compares</h2>
              <p className="text-gray-600 mt-4 text-sm leading-relaxed">
                Enterprise AutoML platforms are powerful, but often too complex, expensive, and broad for SME factory teams. Modliq is focused purely on manufacturing data workflows.
              </p>
            </div>

            <div className="overflow-x-auto bg-[#F0F6FA] border border-[#D0E2F0] rounded-3xl p-4 shadow-sm">
              <table className="w-full text-sm text-left border-collapse bg-white rounded-2xl overflow-hidden shadow-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 font-mono text-xs bg-gray-50">
                    <th className="p-4 font-bold">Capability</th>
                    <th className="p-4">Enterprise AutoML</th>
                    <th className="p-4">Excel + QC Tools</th>
                    <th className="p-4">Consultants</th>
                    <th className="p-4 text-[#2B70AB] font-bold">Modliq</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {[
                    { cap: "No-code workflow", auto: "Partial", excel: "Manual", cons: "Service-based", modliq: "Yes" },
                    { cap: "Natural-language goal input", auto: "Limited", excel: "No", cons: "Yes, human-led", modliq: "Yes" },
                    { cap: "Yield optimization", auto: "Yes", excel: "Manual", cons: "Yes", modliq: "Yes" },
                    { cap: "Control charts + capability", auto: "Limited", excel: "Yes", cons: "Yes", modliq: "Yes" },
                    { cap: "Optimization + quality in one flow", auto: "Limited", excel: "No", cons: "Manual", modliq: "Yes" },
                    { cap: "SOP/trial plan generation", auto: "No", excel: "Manual", cons: "Yes", modliq: "Yes" },
                    { cap: "SME-friendly workflow", auto: "Limited", excel: "Partial", cons: "Costly", modliq: "Yes" },
                    { cap: "Manufacturing-specific outputs", auto: "Partial", excel: "Manual", cons: "Yes", modliq: "Yes" }
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#F0F6FA]/20 transition-colors">
                      <td className="p-4 font-semibold text-[#1B2A4A]">{row.cap}</td>
                      <td className="p-4 text-gray-500">{row.auto}</td>
                      <td className="p-4 text-gray-500">{row.excel}</td>
                      <td className="p-4 text-gray-500">{row.cons}</td>
                      <td className="p-4 text-[#2B70AB] font-bold bg-[#F0F6FA]/50">{row.modliq}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 9. Demo CTA */}
        <section className="py-20 border-b border-gray-100 bg-gradient-to-r from-[#F0F6FA] to-white">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1B2A4A] mb-6">Ready to optimize your production line?</h2>
            <p className="text-gray-600 mb-8 max-w-xl mx-auto text-sm leading-relaxed">
              Launch our pre-loaded manufacturing demo or upload your own CSV process logs to test control charts and optimizer suggestions.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={handleDemoAccess} className="bg-[#2B70AB] hover:bg-[#1B2A4A] text-white font-semibold px-8 py-3.5 rounded-xl transition shadow-lg shadow-[#2B70AB]/20 hover:scale-[1.02]">
                Launch Sandbox Demo
              </button>
              <button onClick={() => setShowLoginModal(true)} className="bg-[#F0F6FA] hover:bg-gray-100 text-[#1B2A4A] font-semibold px-8 py-3.5 rounded-xl transition border border-[#D0E2F0] hover:scale-[1.02]">
                Sign In
              </button>
            </div>
          </div>
        </section>

        {/* 10. FAQ Section */}
        <section id="faq" className="py-24 border-b border-gray-100 bg-[#F0F6FA]/20">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="text-xs font-bold text-[#2B70AB] uppercase tracking-widest block mb-2">Questions</span>
              <h2 className="text-3xl font-bold text-[#1B2A4A]">Frequently Asked Questions</h2>
            </div>

            <div className="space-y-4">
              {[
                {
                  q: "Does Modliq replace quality engineers?",
                  a: "No. Modliq helps quality and process teams analyze data faster and generate decision-support recommendations. Final approval should remain with responsible engineers and managers."
                },
                {
                  q: "Do I need coding or data science knowledge?",
                  a: "No. Modliq is designed specifically for production, quality, and plant teams. It handles model building and SPC logic behind the scenes."
                },
                {
                  q: "Can I use my existing Excel/CSV data?",
                  a: "Yes. Upload CSV files exported from Excel, ERP, MES, or quality logs."
                },
                {
                  q: "Is the recommended setting guaranteed?",
                  a: "No. Modliq provides recommended trial settings based on uploaded data. Validate them through controlled production trials before updating official SOPs."
                },
                {
                  q: "Can it work offline?",
                  a: "Quality Studio can run lightweight statistical checks instantly, with backend-powered reporting and advanced analysis available in paid plans."
                },
                {
                  q: "Is Live Mode available?",
                  a: "Live Mode is planned for future releases. The first version focuses on static CSV-based analysis and quality validation."
                }
              ].map((faq, idx) => (
                <div key={idx} className="bg-white border border-[#D0E2F0] rounded-2xl overflow-hidden transition-all shadow-sm">
                  <button
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full p-5 text-left flex justify-between items-center text-sm font-semibold text-[#1B2A4A] focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    <span className="text-gray-400">
                      {activeFaq === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>
                  {activeFaq === idx && (
                    <div className="px-5 pb-5 text-xs text-gray-500 leading-relaxed border-t border-[#D0E2F0] pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 12. Footer */}
        <footer className="bg-white py-16 text-xs text-gray-500 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b border-gray-100 pb-10 mb-10">
              <div>
                <p className="text-[#1B2A4A] font-bold text-sm mb-2">MODLIQ</p>
                <p className="max-w-xs text-gray-500 leading-relaxed">
                  AI-powered yield optimization and process intelligence platform.
                </p>
              </div>
              <div className="flex flex-wrap gap-12 text-gray-600">
                <div>
                  <h5 className="font-bold text-[#1B2A4A] mb-3">Product</h5>
                  <ul className="space-y-2">
                    <li><a href="#problem" className="hover:text-[#1B2A4A] transition">Problem</a></li>
                    <li><a href="#solution" className="hover:text-[#1B2A4A] transition">Solution</a></li>
                    <li><a href="#pricing" className="hover:text-[#1B2A4A] transition">Pricing</a></li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-bold text-[#1B2A4A] mb-3">Company</h5>
                  <ul className="space-y-2">
                    <li>
                      <a href="https://qeltravaai.vercel.app/en" target="_blank" rel="noopener noreferrer" className="hover:text-[#1B2A4A] transition">
                        Qeltrava AI
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-gray-500">
                &copy; {new Date().getFullYear()} Modliq. A product of Qeltrava AI.
              </p>
              <div className="text-center md:text-right max-w-2xl">
                <p className="text-[10px] text-gray-500 leading-normal font-sans">
                  <strong>Safety Notice:</strong> Modliq provides decision-support recommendations based on uploaded data. 
                  All process changes should be validated through controlled production trials and approved by responsible 
                  engineering or quality personnel before implementation.
                </p>
              </div>
            </div>
          </div>
        </footer>

        {/* GORGEOUS LOGIN MODAL */}
        <AuthModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      </div>
    );
}
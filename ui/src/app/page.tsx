// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { MdFace, MdShare, MdTimeline, MdDescription, MdSecurity } from 'react-icons/md';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <main id="main-content" className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-purple-900 via-purple-800 to-pink-700 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <MdFace className="w-16 h-16 sm:w-20 sm:h-20" aria-hidden="true" />
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold mb-4">ThisIsMe</h1>
            <p className="text-lg sm:text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
              The care coordination platform that helps families share what matters most about their children with schools, healthcare providers, and caregivers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <Button className="w-full sm:w-auto px-8 py-3 text-lg bg-white text-purple-900 hover:bg-purple-50">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button className="w-full sm:w-auto px-8 py-3 text-lg bg-transparent border-2 border-white hover:bg-white/10">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-12">
          Everything you need to coordinate care
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<MdFace className="w-8 h-8" />}
            title="Passport Documents"
            description="Create comprehensive profiles capturing your child's needs, strengths, likes, and dislikes."
          />
          <FeatureCard
            icon={<MdShare className="w-8 h-8" />}
            title="Secure Sharing"
            description="Share with teachers, therapists, and caregivers via password-protected links with granular control."
          />
          <FeatureCard
            icon={<MdTimeline className="w-8 h-8" />}
            title="Timeline Tracking"
            description="Record incidents, milestones, successes, and daily observations over time."
          />
          <FeatureCard
            icon={<MdDescription className="w-8 h-8" />}
            title="Document Storage"
            description="Upload and organize medical records, assessments, and reports in one place."
          />
        </div>
      </div>

      {/* Trust Section */}
      <div className="bg-white border-y border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <MdSecurity className="w-8 h-8 text-purple-600" />
                <h3 className="text-xl font-bold text-gray-900">Built for UK Families</h3>
              </div>
              <p className="text-gray-600 mb-4">
                ThisIsMe is designed with UK GDPR and the Children&apos;s Code at its core. Your child&apos;s data is encrypted, audited, and never shared without your explicit consent.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">&#10003;</span>
                  UK GDPR compliant data processing
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">&#10003;</span>
                  Age Appropriate Design Code certified
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">&#10003;</span>
                  Complete data export and deletion rights
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">&#10003;</span>
                  Full audit trail of all access
                </li>
              </ul>
            </div>
            <div className="flex-1 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl p-8">
              <blockquote className="text-lg italic text-gray-700">
                &ldquo;Finally, a single place to share everything about my daughter. The school, her therapist, and after-school club all have what they need.&rdquo;
              </blockquote>
              <p className="mt-4 text-sm text-gray-500">- Parent of a child with autism</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          Ready to get started?
        </h2>
        <p className="text-gray-600 mb-8 max-w-xl mx-auto">
          Create your free account and start building your child&apos;s passport today.
        </p>
        <Link href="/auth/register">
          <Button className="px-8 py-3 text-lg">
            Create Free Account
          </Button>
        </Link>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} ThisIsMe. All rights reserved.</p>
          <p className="mt-2">
            Designed for families of children with SEND in the UK.
          </p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all">
      <div className="w-12 h-12 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

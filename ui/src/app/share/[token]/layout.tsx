import { Metadata } from 'next';

type Props = {
  params: Promise<{ token: string }>;
};

async function getShareInfo(token: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/share/${token}/check`, {
      cache: 'no-store',
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const shareInfo = await getShareInfo(resolvedParams.token);

  if (!shareInfo || shareInfo.isExpired) {
    return {
      title: 'Shared Passport - ThisIsMe',
      description: 'View a shared care coordination passport',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const childName = shareInfo.passportChildName || 'Child';
  const title = `${childName}'s Care Passport - ThisIsMe`;
  const description = `View ${childName}'s shared care coordination passport with important information about their needs, strengths, and preferences.`;
  const requiresPassword = shareInfo.requiresPassword ? ' (Password protected)' : '';

  return {
    title: title + requiresPassword,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      siteName: 'ThisIsMe',
      locale: 'en_GB',
      images: [
        {
          url: '/og-default.png',
          width: 1200,
          height: 630,
          alt: 'ThisIsMe Care Coordination',
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-default.png'],
    },
    robots: {
      index: false, // Don't index shared passports for privacy
      follow: false,
    },
  };
}

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

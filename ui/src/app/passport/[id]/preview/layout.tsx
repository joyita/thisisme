import { Metadata } from 'next';
import { cookies } from 'next/headers';

type Props = {
  params: Promise<{ id: string }>;
};

async function getPassportData(passportId: string, accessToken: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/passports/${passportId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
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
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  if (!accessToken) {
    return {
      title: 'Passport Preview - ThisIsMe',
      description: 'View and print a care coordination passport',
    };
  }

  const passport = await getPassportData(resolvedParams.id, accessToken);

  if (!passport) {
    return {
      title: 'Passport Preview - ThisIsMe',
      description: 'View and print a care coordination passport',
    };
  }

  const childName = passport.childFirstName || 'Child';
  const title = `${childName}'s Passport - ThisIsMe`;
  const description = `View ${childName}'s care coordination passport with important information about their needs, strengths, and preferences.`;

  // Count published sections
  const publishedCount = Object.values(passport.sections || {})
    .flat()
    .filter((s: any) => s.published)
    .length;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      siteName: 'ThisIsMe',
      locale: 'en_GB',
      images: passport.childAvatar ? [
        {
          url: passport.childAvatar,
          width: 400,
          height: 400,
          alt: `${childName}'s avatar`,
        }
      ] : [],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: passport.childAvatar ? [passport.childAvatar] : [],
    },
    robots: {
      index: false, // Don't index individual passports for privacy
      follow: false,
    },
  };
}

export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

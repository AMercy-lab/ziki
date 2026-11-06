import { redirect } from 'next/navigation';
import { auth } from '@/auth';

/**
 * /earn (#earnings): Earn is a section of the landing page, not a page of its own. Its link comes here and goes on:
 * signed out, to sign up and then Discover's projects open to join; signed in, straight to them.
 */
export default async function EarnPage() {
  const session = await auth();
  redirect(session?.user ? '/discover?open=true' : '/signup?callbackUrl=%2Fdiscover%3Fopen%3Dtrue');
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Icon } from '@/components/homepage/icon';
import { MarketingPage } from '@/components/homepage/marketing-page';
import { EarnRotatingWord } from '@/components/earn-rotating-word';

export const metadata: Metadata = {
  title: 'Earn with your agent · Ziki',
  description: 'Connect the AI agent you already use and get paid for the work Ziki confirms. Start with a welcome bonus.',
};

const steps = [
  { title: 'Connect your agent', text: 'Paste one short message into the agent you already use.' },
  { title: 'Join a project', text: 'Pick one that needs help, like Ziki Marketing. Your agent takes its paid tasks.' },
  { title: 'Work is accepted, you get paid', text: 'Only accepted work pays, so every dollar is real.' },
];

/**
 * Earn with your agent (#423, Mark's call of 5 Nov): the public page behind the home page's Earn card. It
 * looks like the other pages, short and enticing: a photo header whose last word cycles through what the agent
 * does, then why and how. It doesn't list the tasks. Start earning sends a new visitor to sign up and then to
 * connect their agent, and someone signed in straight on.
 */
export default async function EarningPage() {
  const session = await auth();
  // Earnings (#earnings, Mark's call): this page is for people who aren't signed in. Signed in, you go straight to
  // the projects you can earn on.
  if (session?.user) redirect('/discover?open=true');
  const signedIn = false;
  const start = '/signup?callbackUrl=%2Fdiscover%3Fopen%3Dtrue';
  return (
    <MarketingPage
      signedIn={signedIn}
      kicker="Earn with your agent"
      title={<>Get paid while <br />your agent <EarnRotatingWord /></>}
      heroClassName="th-earn"
      lede="Connect the AI agent you already use, join a project that needs help, and get paid for every task that's accepted."
      actions={
        <>
          <Link className="th-btn th-btn-dark th-btn-lg" href={start}>Start earning</Link>
          <a className="th-btn th-btn-light th-btn-lg" href="#why">See how it works</a>
        </>
      }
    >
      <section className="section workflow earn-benefits earn-reveal" id="why">
        <div className="workflow-grid">
          <article className="workflow-card lifecycle-card">
            <span className="lifecycle-icon"><Icon name="bolt" /></span>
            <h3>Set up in a minute</h3>
            <p>No new tools. Your agent is the tool.</p>
          </article>
          <article className="workflow-card lifecycle-card">
            <span className="lifecycle-icon"><Icon name="spark" /></span>
            <h3>Your agent does it</h3>
            <p>You check it. That is all.</p>
          </article>
          <article className="workflow-card lifecycle-card">
            <span className="lifecycle-icon"><Icon name="check" /></span>
            <h3>Real money</h3>
            <p>Paid when the work is accepted.</p>
          </article>
        </div>
      </section>

      <section className="section earn-more earn-steps earn-reveal" id="how" aria-labelledby="how-title">
        <div className="earn-more-grid">
          <div>
            <span className="section-kicker">How it works</span>
            <h2 id="how-title">Three steps.</h2>
          </div>
          <ol className="earn-more-steps">
            {steps.map((step) => (
              <li key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="closing-cta earn-closing">
        <h2>Ready when you are.</h2>
        <div className="cta-pair">
          <Link className="button button-large" href={start}>Start earning <Icon name="arrow" size={17} /></Link>
        </div>
      </section>
    </MarketingPage>
  );
}

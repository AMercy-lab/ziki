import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/auth';
import { Icon } from '@/components/homepage/icon';
import { MarketingPage } from '@/components/homepage/marketing-page';
import { EARN_TASKS, SIGNUP_BONUS } from '@/lib/earn/draft';
import { EARN_TASK_MINUTES, EARN_TASK_UI } from '@/lib/earn/task-ui';
import { EarnRotatingWord } from '@/components/earn-rotating-word';

export const metadata: Metadata = {
  title: 'Earn with your agent · Ziki',
  description: 'Connect the AI agent you already use and get paid for the work Ziki confirms. Start with a welcome bonus.',
};

const faqs = [
  { q: 'Do I need to be technical?', a: 'No. You paste one message into the agent you already use, and it knows what to do.' },
  { q: 'Which agent can I use?', a: 'The one you already have, like ChatGPT or Claude. If it can read a message and look things up, it can earn.' },
  { q: 'How long does a task take?', a: 'Between 2 and 15 minutes. Do them in any order, whenever suits you.' },
  { q: 'How do I get paid?', a: 'Ziki checks every task. Once it is confirmed, the money lands in your balance, right next to Withdraw.' },
  { q: 'Is the welcome real?', a: `Yes. $${SIGNUP_BONUS} is in your balance the first time you open Earn, before you have done a thing.` },
];

const steps = [
  { title: 'Connect your agent', text: 'Paste one short message into the agent you already use.' },
  { title: 'It does the work', text: 'You look it over and send it from your own accounts.' },
  { title: 'Ziki confirms, you get paid', text: 'Only checked work pays, so every dollar is real.' },
];

/**
 * Earn with your agent (#423, Mark's call of 5 Nov): the public page behind the home page's Earn card. It
 * looks like the other pages, short and enticing. No Start earning button at the top; the one at the end
 * sends a new visitor to sign up and then to connect their agent, and someone who already has an account
 * straight on (to connecting, or to their default page if an agent is connected).
 */
export default async function EarningPage() {
  const session = await auth();
  const signedIn = Boolean(session?.user);
  const start = signedIn ? '/earn/start' : '/signup?callbackUrl=%2Fearn%2Fstart';
  return (
    <MarketingPage
      signedIn={signedIn}
      kicker="Earn with your agent"
      title={<>Get paid while <br />your agent <EarnRotatingWord /></>}
      heroClassName="th-earn"
      lede={`Connect the AI agent you already use. It does short marketing tasks for Ziki, you check the work, and you get paid once Ziki confirms it. Start with a $${SIGNUP_BONUS} welcome.`}
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
            <p>Paid when Ziki confirms the work.</p>
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

      <section className="section earn-tasks-show earn-reveal" aria-labelledby="tasks-title">
        <div className="section-heading">
          <h2 id="tasks-title">Your first four tasks.</h2>
          <p>Short, real marketing for Ziki. Your agent does the heavy lifting, you check it and send it. Up to ${EARN_TASKS.reduce((sum, task) => sum + task.pay, 0)} on top of your ${SIGNUP_BONUS} welcome.</p>
        </div>
        <ol className="earn-task-grid">
          {EARN_TASKS.map((task) => (
            <li key={task.id} className="earn-task-tile">
              <span className={`earn-task-icon ${EARN_TASK_UI[task.id].tint}`} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={EARN_TASK_UI[task.id].icon} /></svg>
              </span>
              <span className="earn-task-pay">+${task.pay}</span>
              <h3>{task.title}</h3>
              <p>{task.detail}</p>
              <span className="earn-task-time">About {EARN_TASK_MINUTES[task.id]} min</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="section earn-faq earn-reveal" aria-labelledby="faq-title">
        <div className="section-heading">
          <h2 id="faq-title">Questions, answered.</h2>
        </div>
        <dl className="earn-faq-grid">
          {faqs.map((item) => (
            <div key={item.q} className="earn-faq-item">
              <dt>{item.q}</dt>
              <dd>{item.a}</dd>
            </div>
          ))}
        </dl>
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

import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useMarketing } from '../../context/MarketingContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

interface TryoutEvent {
  _id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  price: number;
  category: string;
  formId?: string;
  school?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
}

interface FormConfig {
  _id: string;
  fields: any[];
  requiresPayment: boolean;
  pricing: {
    basePrice: number;
    packages: any[];
  };
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const TryoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [event, setEvent] = useState<TryoutEvent | null>(null);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);

  const { getMarketingAttribution } = useMarketing();

  useEffect(() => {
    fetchActiveTryout();
  }, []);

  useEffect(() => {
    const utmData = getMarketingAttribution();
    if (utmData.source !== 'direct') {
      console.log('📊 UTM Data captured:', utmData);
    }
  }, [searchParams, getMarketingAttribution]);

  const fetchActiveTryout = async () => {
    try {
      setLoading(true);

      const eventsResponse = await axios.get(
        `${API_BASE_URL}/events?category=tryout`,
      );
      const now = new Date();
      const activeTryout = eventsResponse.data
        .filter((e: any) => e.isActive !== false)
        .sort(
          (a: any, b: any) =>
            new Date(a.start).getTime() - new Date(b.start).getTime(),
        )
        .find(
          (e: any) =>
            new Date(e.start) > now ||
            new Date(e.start).toDateString() === now.toDateString(),
        );

      if (!activeTryout) {
        setError('No active tryouts available');
        setLoading(false);
        return;
      }

      setEvent(activeTryout);

      if (activeTryout.formId) {
        try {
          const formResponse = await axios.get(
            `${API_BASE_URL}/events/forms/${activeTryout.formId}`,
          );
          setFormConfig(formResponse.data);
        } catch (formErr) {
          console.warn('No form config found for this event');
        }
      }
    } catch (err) {
      console.error('Error fetching tryout:', err);
      setError('Failed to load tryout information');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    const marketing = getMarketingAttribution();
    console.log('📝 Registration started with:', marketing);
    setShowRegistration(true);
    document
      .getElementById('registration-section')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  const getImageSrc = (path: string) => {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    if (path.startsWith('/assets')) {
      return path;
    }
    return `/assets/${path}`;
  };

  if (loading) {
    return (
      <div className='tryout-white-root'>
        <div className='tryout-white-wrap'>
          <div className='text-center py-5'>
            <LoadingSpinner />
            <p className='mt-3 text-muted'>Loading tryout information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className='tryout-white-root'>
        <div className='tryout-white-wrap'>
          <div className='text-center py-5'>
            <div className='display-1 text-muted mb-4'>🏀</div>
            <h3 className='text-dark'>No Active Tryouts</h3>
            <p className='text-muted'>
              {error || 'Check back soon for upcoming tryout dates.'}
            </p>
            <Link to='/' className='btn-primary-white mt-3'>
              Return Home <i className='ti ti-arrow-right' />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(event.start).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = new Date(event.start).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className='tryout-white-root'>
      <div className='tryout-white-bg' />

      <div className='tryout-white-wrap'>
        {/* ─── HERO SECTION ──────────────────────────────────────── */}
        <section className='tryout-white-hero'>
          <div className='hero-white-grid'>
            <div className='hero-white-text'>
              <div className='hero-white-eyebrow'>
                <span className='eyebrow-white-dot' />
                {event.category || 'Tryout'} • {new Date().getFullYear()}
              </div>
              <h1 className='hero-white-title'>
                <span className='hero-white-accent'>{event.title}</span>
              </h1>
              <p className='hero-white-lead'>
                {event.description ||
                  'Join Partizan AAU for the upcoming season'}
              </p>

              <div className='hero-white-info-grid'>
                <div className='hero-white-info-item'>
                  <i className='ti ti-calendar-event' />
                  <div>
                    <span className='label'>Date</span>
                    <span className='value'>{formattedDate}</span>
                  </div>
                </div>
                <div className='hero-white-info-item'>
                  <i className='ti ti-clock' />
                  <div>
                    <span className='label'>Time</span>
                    <span className='value'>{formattedTime}</span>
                  </div>
                </div>
                <div className='hero-white-info-item'>
                  <i className='ti ti-map-pin' />
                  <div>
                    <span className='label'>Location</span>
                    <span className='value'>
                      {event.school?.name || 'Partizan AAU Gym'}
                    </span>
                  </div>
                </div>
              </div>

              <div className='hero-white-actions'>
                <button className='btn-primary-white' onClick={handleRegister}>
                  Register Now <i className='ti ti-arrow-right' />
                </button>
                <a href='#details' className='btn-ghost-white'>
                  Learn More <i className='ti ti-chevron-down' />
                </a>
              </div>
            </div>

            <div className='hero-white-img-col'>
              <div className='hero-white-img-glass'>
                <div className='hero-white-glow' />
                <img
                  src={getImageSrc('assets/img/tryout-hero.png')}
                  alt='Partizan AAU Tryouts'
                  className='hero-white-img'
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23f8fafc"/%3E%3Ctext x="200" y="150" text-anchor="middle" fill="%23594230" font-size="24" font-family="Arial"%3E🏀 Tryouts%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
              <div className='hero-white-badge'>
                <i className='ti ti-award' />
                <span>
                  Limited Spots
                  <br />
                  Available
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── DETAILS SECTION ────────────────────────────────────── */}
        <section className='tryout-white-details' id='details'>
          <div className='section-white-hdr'>
            <div className='section-white-tag'>Everything You Need to Know</div>
            <h2 className='section-white-title'>Tryout Details</h2>
            <p className='section-white-sub'>
              Come prepared and ready to showcase your skills
            </p>
          </div>

          <div className='details-white-grid'>
            {/* What to Bring */}
            <div className='details-white-card'>
              <div className='details-white-icon'>
                <i className='ti ti-package' />
              </div>
              <h3 className='details-white-title'>What to Bring</h3>
              <ul className='details-white-list'>
                <li>
                  <i className='ti ti-check' /> Basketball shoes
                </li>
                <li>
                  <i className='ti ti-check' /> Water bottle
                </li>
                <li>
                  <i className='ti ti-check' /> Athletic wear
                </li>
                <li>
                  <i className='ti ti-check' /> Completed waiver
                </li>
              </ul>
            </div>

            {/* What to Expect */}
            <div className='details-white-card'>
              <div className='details-white-icon'>
                <i className='ti ti-info-circle' />
              </div>
              <h3 className='details-white-title'>What to Expect</h3>
              <p className='details-white-body'>
                Tryouts will consist of skill demonstrations, drills, and
                scrimmages. Players will be evaluated on their basketball
                fundamentals, athleticism, and teamwork.
              </p>
            </div>

            {/* Who Can Tryout */}
            <div className='details-white-card'>
              <div className='details-white-icon'>
                <i className='ti ti-users' />
              </div>
              <h3 className='details-white-title'>Who Can Tryout</h3>
              <ul className='details-white-list'>
                <li>
                  <i className='ti ti-check' /> Boys &amp; Girls
                </li>
                <li>
                  <i className='ti ti-check' /> Grades 3-8
                </li>
                <li>
                  <i className='ti ti-check' /> All skill levels welcome
                </li>
              </ul>
            </div>

            {/* Location */}
            <div className='details-white-card'>
              <div className='details-white-icon'>
                <i className='ti ti-map-pin' />
              </div>
              <h3 className='details-white-title'>Location</h3>
              <p className='details-white-body'>
                <strong>{event.school?.name || 'Partizan AAU Gym'}</strong>
                <br />
                {event.school?.address || '1234 Main St'}
                <br />
                {event.school?.city || 'Seattle'}, {event.school?.state || 'WA'}{' '}
                {event.school?.zip || '98101'}
              </p>
              <p className='details-white-note'>
                <i className='ti ti-clock' /> Please arrive 30 minutes early for
                check-in
              </p>
            </div>
          </div>
        </section>

        {/* ─── PRICING / CTA SECTION ────────────────────────────── */}
        <section className='tryout-white-cta'>
          <div className='cta-white-card'>
            <div className='cta-white-glow' />
            <div className='section-white-tag'>Secure Your Spot</div>
            <h2 className='cta-white-title'>
              ${event.price || 50}{' '}
              <span className='cta-white-subtitle'>per player</span>
            </h2>
            <p className='cta-white-body'>
              Registration closes 24 hours before tryouts. Don't miss your
              chance to join Partizan AAU.
            </p>

            <div className='cta-white-features'>
              <div className='cta-white-feature'>
                <i className='ti ti-check-circle' />
                <span>Expert Coaching</span>
              </div>
              <div className='cta-white-feature'>
                <i className='ti ti-check-circle' />
                <span>Skill Development</span>
              </div>
              <div className='cta-white-feature'>
                <i className='ti ti-check-circle' />
                <span>Competitive Play</span>
              </div>
            </div>

            <div className='cta-white-actions'>
              <button
                className='btn-primary-white btn-white-large'
                onClick={handleRegister}
              >
                Register Now <i className='ti ti-arrow-right' />
              </button>
              <p className='cta-white-note'>
                <i className='ti ti-info-circle' /> Limited spots available
              </p>
            </div>
          </div>
        </section>

        {/* ─── UTM Debug (Development Only) ────────────────────── */}
        {process.env.NODE_ENV === 'development' && (
          <div className='tryout-white-debug'>
            <div className='debug-white-card'>
              <strong>🔍 UTM Debug:</strong>
              <pre>{JSON.stringify(getMarketingAttribution(), null, 2)}</pre>
            </div>
          </div>
        )}
      </div>

      {/* ─── STYLES ────────────────────────────────────────────────── */}
      <style>{`
        /* ── Root & Background ──────────────────────────────────── */
        .tryout-white-root {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
          position: relative;
          overflow-x: hidden;
          font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
          color: #1e293b;
        }

        .tryout-white-bg {
          position: fixed;
          inset: 0;
          background:
            radial-gradient(circle at 15% 40%, rgba(89, 66, 48, 0.04) 0%, transparent 55%),
            radial-gradient(circle at 85% 70%, rgba(89, 66, 48, 0.03) 0%, transparent 55%);
          pointer-events: none;
          z-index: 0;
        }

        /* ── Wrapper ──────────────────────────────────────────── */
        .tryout-white-wrap {
          position: relative;
          z-index: 1;
          max-width: 1200px;
          margin: 0 auto;
          padding: 60px 24px 80px;
          display: flex;
          flex-direction: column;
          gap: 80px;
        }

        /* ── Shared Components ────────────────────────────────── */
        .section-white-tag {
          display: inline-block;
          font-size: 0.73rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #594230;
          background: rgba(89, 66, 48, 0.1);
          border: 1px solid rgba(89, 66, 48, 0.2);
          padding: 4px 14px;
          border-radius: 40px;
          margin-bottom: 12px;
        }

        .section-white-title {
          font-size: clamp(1.8rem, 3.5vw, 2.5rem);
          font-weight: 800;
          letter-spacing: -0.025em;
          line-height: 1.15;
          margin: 0 0 12px;
          background: linear-gradient(135deg, #1e293b 0%, #594230 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .section-white-sub {
          font-size: 1rem;
          color: #64748b;
          line-height: 1.65;
          max-width: 520px;
          margin: 0;
        }

        .section-white-hdr {
          text-align: center;
          margin-bottom: 48px;
        }
        .section-white-hdr .section-white-sub {
          margin: 0 auto;
        }

        /* ── Buttons ──────────────────────────────────────────── */
        .btn-primary-white {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #594230 0%, #8b7355 100%);
          color: #fff;
          padding: 13px 28px;
          border-radius: 40px;
          font-size: 0.95rem;
          font-weight: 600;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .btn-primary-white:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(89, 66, 48, 0.3);
          color: #fff;
        }
        .btn-primary-white.btn-white-large {
          padding: 16px 40px;
          font-size: 1.05rem;
        }

        .btn-ghost-white {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          color: #475569;
          padding: 13px 28px;
          border-radius: 40px;
          font-size: 0.95rem;
          font-weight: 600;
          text-decoration: none;
          border: 1px solid #e2e8f0;
          transition: all 0.25s ease;
        }
        .btn-ghost-white:hover {
          background: #f1f5f9;
          border-color: #594230;
          color: #594230;
          transform: translateY(-2px);
        }

        /* ─── HERO ─────────────────────────────────────────────── */
        .hero-white-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 56px;
          align-items: center;
        }

        .hero-white-eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 18px;
        }

        .eyebrow-white-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #594230;
          box-shadow: 0 0 8px rgba(89, 66, 48, 0.3);
          flex-shrink: 0;
        }

        .hero-white-title {
          font-size: clamp(2.2rem, 4.5vw, 3.6rem);
          font-weight: 900;
          letter-spacing: -0.035em;
          line-height: 1.1;
          margin: 0 0 18px;
          color: #1e293b;
        }

        .hero-white-accent {
          background: linear-gradient(135deg, #594230, #8b7355);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .hero-white-lead {
          font-size: 1rem;
          color: #475569;
          line-height: 1.72;
          margin-bottom: 32px;
        }

        .hero-white-info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }

        .hero-white-info-item {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px 16px;
        }
        .hero-white-info-item i {
          color: #594230;
          font-size: 1.2rem;
          flex-shrink: 0;
        }
        .hero-white-info-item .label {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #94a3b8;
          display: block;
        }
        .hero-white-info-item .value {
          font-size: 0.85rem;
          font-weight: 600;
          color: #1e293b;
          display: block;
        }

        .hero-white-actions {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
        }

        .hero-white-img-col {
          position: relative;
        }

        .hero-white-img-glass {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 36px;
          padding: 40px 32px;
          text-align: center;
          position: relative;
          overflow: hidden;
          box-shadow: 0 8px 40px rgba(0, 0, 0, 0.05);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .hero-white-img-glass:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 56px rgba(0, 0, 0, 0.1);
        }

        .hero-white-glow {
          position: absolute;
          top: -60px;
          left: 50%;
          transform: translateX(-50%);
          width: 300px;
          height: 300px;
          background: rgba(89, 66, 48, 0.08);
          filter: blur(80px);
          pointer-events: none;
          border-radius: 50%;
        }

        .hero-white-img {
          max-width: 100%;
          height: auto;
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 12px 32px rgba(0, 0, 0, 0.1));
        }

        .hero-white-badge {
          position: absolute;
          bottom: -20px;
          right: 20px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 12px 18px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.78rem;
          font-weight: 600;
          line-height: 1.3;
          color: #1e293b;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        }
        .hero-white-badge i {
          font-size: 1.4rem;
          color: #f59e0b;
          flex-shrink: 0;
        }

        /* ─── DETAILS ───────────────────────────────────────────── */
        .details-white-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .details-white-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 28px;
          padding: 32px 28px;
          transition: all 0.25s ease;
        }
        .details-white-card:hover {
          border-color: #594230;
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
        }

        .details-white-icon {
          width: 52px;
          height: 52px;
          background: rgba(89, 66, 48, 0.1);
          border: 1px solid rgba(89, 66, 48, 0.2);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .details-white-icon i {
          font-size: 1.5rem;
          color: #594230;
        }

        .details-white-title {
          font-size: 1.12rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 12px;
        }

        .details-white-body {
          font-size: 0.9rem;
          color: #64748b;
          line-height: 1.65;
          margin: 0;
        }

        .details-white-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .details-white-list li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.9rem;
          color: #64748b;
          padding: 4px 0;
        }
        .details-white-list li i {
          color: #22c55e;
          font-size: 1rem;
        }

        .details-white-note {
          font-size: 0.8rem;
          color: #94a3b8;
          margin: 12px 0 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .details-white-note i {
          color: #594230;
        }

        /* ─── CTA ────────────────────────────────────────────────── */
        .cta-white-card {
          background: rgba(89, 66, 48, 0.04);
          border: 1px solid rgba(89, 66, 48, 0.15);
          border-radius: 36px;
          padding: 64px 80px;
          text-align: center;
          position: relative;
          overflow: hidden;
          box-shadow: 0 8px 40px rgba(0, 0, 0, 0.03);
        }

        .cta-white-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 500px;
          height: 300px;
          background: rgba(89, 66, 48, 0.05);
          filter: blur(80px);
          pointer-events: none;
          border-radius: 50%;
        }

        .cta-white-title {
          font-size: clamp(2.5rem, 4vw, 3.5rem);
          font-weight: 900;
          letter-spacing: -0.025em;
          color: #1e293b;
          margin: 0 0 8px;
          position: relative;
        }
        .cta-white-subtitle {
          font-size: 1.2rem;
          font-weight: 400;
          color: #94a3b8;
        }

        .cta-white-body {
          font-size: 1rem;
          color: #475569;
          line-height: 1.75;
          max-width: 520px;
          margin: 0 auto 24px;
          position: relative;
        }

        .cta-white-features {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }
        .cta-white-feature {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          color: #475569;
        }
        .cta-white-feature i {
          color: #22c55e;
          font-size: 1.1rem;
        }

        .cta-white-actions {
          position: relative;
        }

        .cta-white-note {
          font-size: 0.8rem;
          color: #94a3b8;
          margin: 12px 0 0;
        }
        .cta-white-note i {
          color: #594230;
        }

        /* ─── DEBUG ────────────────────────────────────────────── */
        .tryout-white-debug {
          margin-top: 40px;
        }
        .debug-white-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px 20px;
        }
        .debug-white-card pre {
          margin: 8px 0 0;
          font-size: 11px;
          color: #64748b;
          overflow: auto;
        }

        /* ─── Responsive ───────────────────────────────────────── */
        @media (max-width: 1024px) {
          .details-white-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .cta-white-card {
            padding: 48px 40px;
          }
        }

        @media (max-width: 768px) {
          .tryout-white-wrap {
            gap: 56px;
            padding: 40px 16px 60px;
          }
          .hero-white-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .hero-white-img-col {
            order: -1;
          }
          .hero-white-badge {
            bottom: -14px;
            right: 12px;
            font-size: 0.72rem;
          }
          .hero-white-info-grid {
            grid-template-columns: 1fr;
          }
          .details-white-grid {
            grid-template-columns: 1fr;
          }
          .cta-white-card {
            padding: 40px 24px;
          }
          .cta-white-features {
            flex-direction: column;
            align-items: center;
          }
        }

        @media (max-width: 480px) {
          .hero-white-actions {
            flex-direction: column;
          }
          .btn-primary-white,
          .btn-ghost-white {
            justify-content: center;
          }
          .btn-primary-white.btn-white-large {
            padding: 14px 28px;
            font-size: 0.95rem;
          }
          .hero-white-title {
            font-size: 1.8rem;
          }
          .hero-white-lead {
            font-size: 0.9rem;
          }
          .details-white-card {
            padding: 24px 20px;
          }
          .details-white-icon {
            width: 44px;
            height: 44px;
          }
          .details-white-icon i {
            font-size: 1.2rem;
          }
          .cta-white-title {
            font-size: 2rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-white-img-glass,
          .details-white-card {
            transition: none;
          }
          .hero-white-img-glass:hover,
          .details-white-card:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
};

export default TryoutPage;

import React, { useEffect, useRef, useState } from 'react';
import ImageWithBasePath from '../../core/common/imageWithBasePath';
import './AboutUsPage.css';

const stats = [
  { value: '500+', label: 'Players Developed' },
  { value: '12+', label: 'Years of Excellence' },
  { value: '95%', label: 'College Placement' },
  { value: '30+', label: 'Championship Titles' },
];

const differentiators = [
  {
    icon: 'ti-ball-basketball',
    title: 'Expert Coaching',
    description:
      'Our camp is led by experienced coaches passionate about basketball and dedicated to helping each camper excel. With a focus on individualized instruction, our coaches bring a wealth of knowledge to every session.',
  },
  {
    icon: 'ti-clipboard-list',
    title: 'Comprehensive Curriculum',
    description:
      'We offer a curriculum designed for all skill levels — from beginners to advanced. Shooting, ball-handling, defense, teamwork, and more. Every aspect of the game, covered.',
  },
  {
    icon: 'ti-heart-handshake',
    title: 'Positive Environment',
    description:
      'We prioritize a positive, inclusive environment where campers feel supported and motivated. Building confidence, fostering friendships, and instilling sportsmanship and respect.',
  },
  {
    icon: 'ti-confetti',
    title: 'Fun & Engaging Activities',
    description:
      "Beyond training, our camp features team-building exercises, friendly competitions, and exciting challenges. There's never a dull moment at Partizan.",
  },
];

const AboutUsPage = () => {
  const [visibleSections, setVisibleSections] = useState<Set<string>>(
    new Set(),
  );
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-section');
            if (id) setVisibleSections((prev) => new Set([...prev, id]));
          }
        });
      },
      { threshold: 0.12 },
    );
    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const setRef = (id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };
  const isVisible = (id: string) => visibleSections.has(id);

  return (
    <div className='about-white-root'>
      {/* Background */}
      <div className='about-white-bg' />

      <div className='about-white-wrap'>
        {/* ── HERO ──────────────────────────────────────── */}
        <section
          className={`ab-white-section ab-white-hero ${isVisible('hero') ? 'vis' : ''}`}
          data-section='hero'
          ref={setRef('hero')}
        >
          <div className='hero-white-grid'>
            <div className='hero-white-text'>
              <div className='hero-white-eyebrow'>
                <span className='eyebrow-white-dot' />
                Partizan AAU
              </div>
              <h1 className='hero-white-title'>
                Welcome to
                <br />
                <span className='hero-white-accent'>Where Champions</span>
                <br />
                Are Made
              </h1>
              <p className='hero-white-lead'>
                You are at the place where passion for basketball meets the joy
                of learning and growth. Established to provide aspiring young
                athletes with a platform to develop their skills, foster
                teamwork, and cultivate a love for the game — our camp is where
                dreams are nurtured.
              </p>
              <div className='hero-white-actions'>
                <a href='/register' className='btn-primary-white'>
                  Join Our Program <i className='ti ti-arrow-right' />
                </a>
                <a href='/contact-us' className='btn-ghost-white'>
                  Get in Touch
                </a>
              </div>
            </div>

            <div className='hero-white-img-col'>
              <div className='hero-white-img-glass'>
                <div className='hero-white-glow' />
                <ImageWithBasePath
                  src='assets/img/aboutus.png'
                  alt='Partizan Basketball'
                  className='hero-white-img'
                />
              </div>
              <div className='hero-white-badge'>
                <i className='ti ti-award' />
                <span>
                  #1 Youth Program
                  <br />
                  in the Pacific NW
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── MISSION ───────────────────────────────────── */}
        <section
          className={`ab-white-section ab-white-mission ${isVisible('mission') ? 'vis' : ''}`}
          data-section='mission'
          ref={setRef('mission')}
        >
          <div className='mission-white-card'>
            <div className='mission-white-icon-wrap'>
              <i className='ti ti-target-arrow' />
            </div>
            <div className='section-white-tag'>Our Mission</div>
            <h2 className='section-white-title'>More Than Just a Sport</h2>
            <p className='mission-white-body'>
              At Partizan, our mission is simple yet profound: to inspire and
              empower young basketball players to reach their full potential,
              both on and off the court. We believe that basketball is more than
              just a sport — it's a vehicle for personal growth, character
              development, and lifelong friendships.
            </p>
            <div className='mission-white-rule' />
            <p className='mission-white-body'>
              Through expert coaching, comprehensive skill development programs,
              and a supportive community environment, we strive to create an
              unforgettable experience that leaves a lasting impact on every
              camper.
            </p>
            <blockquote className='mission-white-quote'>
              "Basketball is more than just a sport — it's a vehicle for
              personal growth, character development, and lifelong friendships."
              <cite>Zo Savovic — Partizan</cite>
            </blockquote>
          </div>
        </section>

        {/* ── WHAT SETS US APART ────────────────────────── */}
        <section
          className={`ab-white-section ab-white-diff ${isVisible('diff') ? 'vis' : ''}`}
          data-section='diff'
          ref={setRef('diff')}
        >
          <div className='section-white-hdr'>
            <div className='section-white-tag'>What Sets Us Apart</div>
            <h2 className='section-white-title'>The Partizan Difference</h2>
            <p className='section-white-sub'>
              Everything we do is designed to give every player the best
              possible foundation — on the court and in life.
            </p>
          </div>
          <div className='diff-white-grid'>
            {differentiators.map((d, i) => (
              <div
                className='diff-white-card'
                key={i}
                style={{ animationDelay: `${i * 0.12}s` }}
              >
                <div className='diff-white-icon'>
                  <i className={`ti ${d.icon}`} />
                </div>
                <h3 className='diff-white-title'>{d.title}</h3>
                <p className='diff-white-body'>{d.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── JOIN US ───────────────────────────────────── */}
        <section
          className={`ab-white-section ab-white-join ${isVisible('join') ? 'vis' : ''}`}
          data-section='join'
          ref={setRef('join')}
        >
          <div className='join-white-card'>
            <div className='join-white-glow' />
            <div className='section-white-tag'>Join Us!</div>
            <h2 className='join-white-title'>
              An Unforgettable Basketball Experience
            </h2>
            <p className='join-white-body'>
              Come be a part of our vibrant community, learn from expert
              coaches, make new friends, and take your basketball skills to new
              heights. For more information about our camp programs, coaching
              staff, registration details, and upcoming sessions — explore our
              website or contact us directly.
            </p>
            <p className='join-white-tagline'>
              We can't wait to welcome you to our family!
            </p>
            <div className='join-white-actions'>
              <a href='/register' className='btn-primary-white'>
                Register Now <i className='ti ti-arrow-right' />
              </a>
              <a href='/contact-us' className='btn-ghost-white'>
                Contact Us
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutUsPage;

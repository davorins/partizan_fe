import React, { useEffect, useRef, useState } from 'react';
import ImageWithBasePath from '../../core/common/imageWithBasePath';
import './OurTeamPage.css';

const OurTeamPage = () => {
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

  const philosophies = [
    {
      icon: 'ti ti-chart-line',
      title: 'Skill Development',
      description:
        'We prioritize individual skill development in all aspects of the game, including shooting, ball-handling, passing, defense, and more.',
    },
    {
      icon: 'ti ti-users',
      title: 'Teamwork & Collaboration',
      description:
        'We emphasize the importance of teamwork, communication, and collaboration both on and off the court. Campers learn to work together, support each other, and celebrate success as a team.',
    },
    {
      icon: 'ti ti-hand-grab',
      title: 'Sportsmanship & Respect',
      description:
        'We instill values of sportsmanship, respect, and integrity in our campers, teaching them to compete with honor and respect for their opponents, coaches, and officials.',
    },
    {
      icon: 'ti ti-confetti',
      title: 'Fun & Positive Environment',
      description:
        'We believe that learning and improvement are most effective in a fun, positive, and supportive environment. Our coaches strive to create an atmosphere where campers feel motivated, encouraged, and inspired to do their best.',
    },
  ];

  return (
    <div className='team-white-root'>
      {/* Background */}
      <div className='team-white-bg' />
      <div className='team-white-orb team-white-orb-1' />
      <div className='team-white-orb team-white-orb-2' />
      <div className='team-white-orb team-white-orb-3' />

      <div className='team-white-wrap'>
        {/* ── HERO ──────────────────────────────────────── */}
        <section
          className={`tm-white-section tm-white-hero ${isVisible('hero') ? 'vis' : ''}`}
          data-section='hero'
          ref={setRef('hero')}
        >
          <div className='hero-white-grid'>
            <div className='hero-white-text'>
              <div className='hero-white-eyebrow'>
                <span className='eyebrow-white-dot' />
                Our Team
              </div>
              <h1 className='hero-white-title'>
                Our Team
                <br />
                <span className='hero-white-accent'>& Coaches</span>
              </h1>
              <p className='hero-white-lead'>
                At Partizan, we take pride in assembling a team of dedicated and
                experienced coaches who are passionate about basketball and
                committed to providing an enriching experience for all
                participants. Our coaches bring a wealth of knowledge, skills,
                and enthusiasm to each session, ensuring that every player
                receives top-notch instruction and guidance.
              </p>
            </div>

            <div className='hero-white-img-col'>
              <div className='hero-white-img-glass'>
                <div className='hero-white-glow' />
                <ImageWithBasePath
                  src='assets/img/our-team.png'
                  alt='Our Team and Coaches'
                  className='hero-white-img'
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── COACHING PHILOSOPHY ───────────────────────────────────── */}
        <section
          className={`tm-white-section tm-white-philosophy ${isVisible('philosophy') ? 'vis' : ''}`}
          data-section='philosophy'
          ref={setRef('philosophy')}
        >
          <div className='section-white-hdr'>
            <div className='section-white-tag'>Our Philosophy</div>
            <h2 className='section-white-title'>Our Coaching Philosophy</h2>
            <p className='section-white-sub'>
              At Partizan, we believe that basketball is more than just a game –
              it's an opportunity for growth, development, and personal
              excellence.
            </p>
          </div>

          <div className='philosophy-white-grid'>
            {philosophies.map((ph, i) => (
              <div className='philosophy-white-card' key={i}>
                <div className='philosophy-white-icon'>
                  <i className={ph.icon} />
                </div>
                <h3>{ph.title}</h3>
                <p>{ph.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── JOIN US ────────────────────────────────────────── */}
        <section
          className={`tm-white-section tm-white-join ${isVisible('join') ? 'vis' : ''}`}
          data-section='join'
          ref={setRef('join')}
        >
          <div className='join-white-card'>
            <div className='join-white-glow' />
            <div className='section-white-tag'>Join Us</div>
            <h2 className='join-white-title'>
              An Unforgettable Basketball Experience
            </h2>
            <p className='join-white-body'>
              Whether your child is a beginner looking to learn the fundamentals
              of basketball or an experienced player seeking to take their game
              to the next level,
              <strong> Partizan</strong> is the perfect place.
            </p>
            <p className='join-white-body'>
              Enroll your child today for an unforgettable basketball experience
              led by our team of dedicated coaches.
            </p>
            <div className='join-white-actions'>
              <a href='/register' className='btn-primary-white'>
                Register Now <i className='ti ti-arrow-right' />
              </a>
              <a href='/contact-us' className='btn-ghost-white'>
                Contact Us
              </a>
            </div>
            <div className='join-white-contact'>
              <i className='ti ti-mail' />
              <span>partizanhoops@proton.me</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default OurTeamPage;

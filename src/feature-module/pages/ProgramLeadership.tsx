import React, { useEffect, useRef, useState } from 'react';
import ImageWithBasePath from '../../core/common/imageWithBasePath';
import './ProgramLeadership.css';

const ProgramLeadership = () => {
  const [visibleSections, setVisibleSections] = useState<Set<string>>(
    new Set(),
  );
  const [expandedLeader, setExpandedLeader] = useState<string | null>(null);
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

  const toggleExpand = (leaderId: string) => {
    setExpandedLeader(expandedLeader === leaderId ? null : leaderId);
  };

  return (
    <div className='leadership-white-root'>
      {/* Background */}
      <div className='leadership-white-bg' />

      <div className='leadership-white-wrap'>
        {/* ── HERO ──────────────────────────────────────── */}
        <section
          className={`ld-white-section ld-white-hero ${isVisible('hero') ? 'vis' : ''}`}
          data-section='hero'
          ref={setRef('hero')}
        >
          <div className='hero-white-grid'>
            <div className='hero-white-text'>
              <div className='hero-white-eyebrow'>
                <span className='eyebrow-white-dot' />
                Program Leadership
              </div>
              <h1 className='hero-white-title'>
                Meet the Leaders
                <br />
                <span className='hero-white-accent'>Behind Partizan</span>
              </h1>
              <p className='hero-white-lead'>
                Our leadership team brings decades of professional and
                collegiate experience to develop the next generation of
                basketball players.
              </p>
            </div>

            <div className='hero-white-img-col'>
              <div className='hero-white-img-glass'>
                <div className='hero-white-glow' />
                <ImageWithBasePath
                  src='assets/img/program-leadership.png'
                  alt='Program Leadership'
                  className='hero-white-img'
                />
              </div>
              <div className='hero-white-badge'>
                <i className='ti ti-award' />
                <span>
                  Decades of Experience
                  <br />
                  Developing Champions
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── ZLATKO SAVOVIC ───────────────────────────────────── */}
        <section
          className={`ld-white-section ld-white-leader ${isVisible('leader1') ? 'vis' : ''}`}
          data-section='leader1'
          ref={setRef('leader1')}
        >
          <div className='leader-white-card'>
            <div className='leader-white-header'>
              <div className='leader-white-image-placeholder'>
                <div className='leader-white-image-inner'>
                  <ImageWithBasePath
                    src='assets/img/zo.png'
                    alt='Zlatko (Zo) Savovic'
                  />
                </div>
              </div>
              <div className='leader-white-title-section'>
                <div className='section-white-tag'>President</div>
                <h2 className='leader-white-name'>Zlatko (Zo) Savovic</h2>
                <div className='leader-white-title-line'>
                  President & Founder
                </div>
              </div>
            </div>

            <div
              className={`leader-white-content ${expandedLeader === 'zlatko' ? 'expanded' : ''}`}
            >
              <div className='leader-white-bio-full'>
                <p>
                  <strong>Education & College Career</strong>
                  <br />
                  Zlatko's basketball career started in Belgrade, Serbia, in
                  1993 where he played for Beovuk. Over the next four years he
                  learned Yugoslavian basketball style, structure, and
                  fundamentals. Former Yugoslavia is a famous, successful, and
                  proud nation producing some of the World's greatest basketball
                  players like Nikola Jokic, Luka Doncic, Vlade Divac, Drazen
                  Petrovic, and many others.
                </p>
                <p>
                  In 1997 his family moved to the United States where he
                  continued basketball at Everett High School in Everett,
                  Washington State. Following his Senior Year in 1999 Zlatko was
                  awarded WESCO Player of the Year Award and was nominated to
                  the Washington State All Star Team alongside former NBA player
                  and current NBA analyst Jamal Crawford.
                </p>
                <p>
                  He was also awarded a Scholarship to Lehigh University, a
                  Patriot League Division I school. His Senior Year at Lehigh
                  University he averaged 14.6 points/game, 4.1 rebounds/game and
                  4.1 assists/game and was nominated to All-Patriot League First
                  Team for the 2002-03 season. He earned a bachelor's degree in
                  Mechanical Engineering from Lehigh University.
                </p>
                <p>
                  <strong>Basketball Career</strong>
                  <br />
                  Playing at the High School level, Division I level, and
                  professionally in Europe, has reinforced his knowledge and
                  deep understanding of systems, player development, and mental
                  demands that are required from basketball players today. He
                  also understands the importance of education and its emphasis
                  on overall development of young athletes.
                </p>
                <p>
                  His coaching philosophy emphasizes fundamentals,
                  accountability, confidence, and character building, thus
                  ensuring that every athlete is prepared not just for the next
                  level of basketball, but for life beyond the game! Above all,
                  Zlatko's passion lies in helping young players grow, learn,
                  and to believe in their potential. His programs are built on
                  respect for the game, the teammates, the coaching staff, and
                  genuine commitment to each child's journey.
                </p>
              </div>

              <div className='leader-white-quote'>
                <i className='ti ti-quote' />
                <p>
                  "My coaching philosophy emphasizes fundamentals,
                  accountability, confidence, and character building — ensuring
                  that every athlete is prepared not just for the next level of
                  basketball, but for life beyond the game!"
                </p>
                <cite>— Zlatko Savovic</cite>
              </div>
            </div>

            <button
              className='expand-white-btn'
              onClick={() => toggleExpand('zlatko')}
            >
              {expandedLeader === 'zlatko' ? (
                <>
                  Show Less <i className='ti ti-chevron-up' />
                </>
              ) : (
                <>
                  Read Full Bio <i className='ti ti-chevron-down' />
                </>
              )}
            </button>
          </div>
        </section>

        {/* ── ARMEND KAHRIMANOVIC ───────────────────────────────── */}
        <section
          className={`ld-white-section ld-white-leader ${isVisible('leader2') ? 'vis' : ''}`}
          data-section='leader2'
          ref={setRef('leader2')}
        >
          <div className='leader-white-card'>
            <div className='leader-white-header'>
              <div className='leader-white-image-placeholder'>
                <div className='leader-white-image-inner'>
                  <ImageWithBasePath
                    src='assets/img/ak.png'
                    alt='Armend Kahrimanovic'
                  />
                </div>
              </div>
              <div className='leader-white-title-section'>
                <div className='section-white-tag'>Vice President</div>
                <h2 className='leader-white-name'>Armend Kahrimanovic</h2>
                <div className='leader-white-title-line'>
                  Vice President & Head Coach
                </div>
              </div>
            </div>

            <div
              className={`leader-white-content ${expandedLeader === 'armend' ? 'expanded' : ''}`}
            >
              <div className='leader-white-bio-full'>
                <p>
                  Armend Kahrimanovic is the Vice President and the Head Coach
                  of Partizan AAU Basketball. He is dedicated to developing
                  young athletes through high-level skill training, discipline,
                  and a strong basketball culture built around fundamentals,
                  competitiveness, and love for the game.
                </p>
                <p>
                  <strong>Background & Playing Career</strong>
                  <br />
                  Originally from Bosnia and Herzegovina, Armend grew up in the
                  European basketball system that is known for demanding
                  practices, strong fundamentals, and a team-oriented
                  philosophy. Growing up in the former Yugoslavia, he trained
                  daily in a system that emphasized skill development,
                  basketball IQ, and understanding the game at a deep level.
                  Those early years shaped his work ethic and passion for
                  basketball.
                </p>
                <p>
                  Armend continued his basketball journey in the United States
                  where he played NCAA Division I basketball at the University
                  of Idaho. Competing at the highest level of college basketball
                  allowed him to gain valuable experience against elite
                  competition and further expand his understanding of the game.
                </p>
                <p>
                  Following his collegiate career, Armend continued playing
                  professionally in Europe, competing for several teams across
                  the continent, including clubs in Greece and the Balkans.
                  Playing internationally allowed him to experience different
                  basketball systems, coaching philosophies, and styles of play,
                  which continue to influence the way he teaches the game today.
                </p>
                <p>
                  <strong>Coaching Philosophy</strong>
                  <br />
                  Today, Armend brings his international experience and
                  knowledge to youth basketball through Partizan AAU. His
                  coaching philosophy blends the structured fundamentals of
                  European basketball with the athleticism and competitiveness
                  of the American game.
                </p>
                <p>
                  For Armend, it is extremely important that young players
                  develop creativity on the court. He believes players must have
                  the freedom to play instinctively, make decisions, and express
                  their game naturally. At the same time, he demands discipline,
                  effort, and accountability. Players are expected to compete
                  hard, play with energy, and hustle on every possession.
                </p>
                <p>
                  Through Partizan AAU, Armend is committed to helping players
                  grow not only as basketball athletes but also as individuals.
                  His goal is to develop confident, skilled, and intelligent
                  players who understand the game and carry strong work habits
                  both on and off the court.
                </p>
              </div>

              <div className='leader-white-philosophy'>
                <h4>Core Coaching Principles</h4>
                <ul>
                  <li>
                    Blends European fundamentals with American athleticism
                  </li>
                  <li>Encourages creativity and instinctive play</li>
                  <li>Demands discipline, effort, and accountability</li>
                  <li>Develops confident, skilled, intelligent players</li>
                  <li>Players must have freedom to play instinctively</li>
                  <li>Hustle on every possession is non-negotiable</li>
                </ul>
              </div>

              <div className='leader-white-quote'>
                <i className='ti ti-quote' />
                <p>
                  "Players must have the freedom to play instinctively, make
                  decisions, and express their game naturally. At the same time,
                  I demand discipline, effort, and accountability."
                </p>
                <cite>— Armend Kahrimanovic</cite>
              </div>
            </div>

            <button
              className='expand-white-btn'
              onClick={() => toggleExpand('armend')}
            >
              {expandedLeader === 'armend' ? (
                <>
                  Show Less <i className='ti ti-chevron-up' />
                </>
              ) : (
                <>
                  Read Full Bio <i className='ti ti-chevron-down' />
                </>
              )}
            </button>
          </div>
        </section>

        {/* ── VALUES ────────────────────────────────────────── */}
        <section
          className={`ld-white-section ld-white-values ${isVisible('values') ? 'vis' : ''}`}
          data-section='values'
          ref={setRef('values')}
        >
          <div className='section-white-hdr'>
            <div className='section-white-tag'>Our Philosophy</div>
            <h2 className='section-white-title'>
              Building Champions On & Off the Court
            </h2>
            <p className='section-white-sub'>
              We believe in developing not just skilled athletes, but
              well-rounded individuals.
            </p>
          </div>
          <div className='values-white-grid'>
            <div className='value-white-card'>
              <div className='value-white-icon'>
                <i className='ti ti-heart-handshake' />
              </div>
              <h3>Character First</h3>
              <p>
                Building integrity, respect, and leadership skills that last a
                lifetime.
              </p>
            </div>
            <div className='value-white-card'>
              <div className='value-white-icon'>
                <i className='ti ti-brain' />
              </div>
              <h3>Basketball IQ</h3>
              <p>
                Teaching the mental game — reading defenses, making smart
                decisions.
              </p>
            </div>
            <div className='value-white-card'>
              <div className='value-white-icon'>
                <i className='ti ti-trending-up' />
              </div>
              <h3>Continuous Growth</h3>
              <p>
                Every player has a path to improve, regardless of starting
                level.
              </p>
            </div>
            <div className='value-white-card'>
              <div className='value-white-icon'>
                <i className='ti ti-users' />
              </div>
              <h3>Team Unity</h3>
              <p>
                Creating a supportive environment where everyone lifts each
                other up.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProgramLeadership;

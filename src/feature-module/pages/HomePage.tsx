import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SpotlightContent from '../../components/spotlight/SpotlightContent';
import RegistrationHub from '../../feature-module/components/registration/RegistrationHub';
import FormEmbed from '../../components/FormEmbed';
import HomeModals from './homeModals';
import {
  RegistrationFormConfig,
  TournamentSpecificConfig,
  TryoutSpecificConfig,
  SeasonEvent,
} from '../../types/registration-types';
import TodayEvents from '../components/TodayEvents/TodayEvents';
import VideoGallery from '../components/VideoGallery/VideoGallery';
import { scrollToSection } from '../../utils/scrollUtils';
import './HomePage.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Default video URL (provided)
const DEFAULT_VIDEO_URL =
  'https://pub-3eb0901007e24e51b6ed1bde149cb0bb.r2.dev/videos/d5544a4901f1332b3c3be0eecb4aeb8f-1771636396900.mp4';

interface HomePageProps {
  onSplashClose: () => void;
}

const HERO_TITLE = 'Welcome to Partizan!';
const HERO_BODY =
  'Being part of the Partizan basketball program requires a dedicated commitment throughout the season. Our objective is to develop well-rounded players who are prepared to compete successfully at the next level by emphasizing strong fundamentals, discipline, and basketball IQ.';

const HomePage: React.FC<HomePageProps> = ({ onSplashClose }) => {
  const { isLoading, parent, isAuthenticated, checkAuth } = useAuth();
  const navigate = useNavigate();
  const isAdmin = parent?.role === 'admin';
  const token = localStorage.getItem('token');

  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Contact form states
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [showContactSuccess, setShowContactSuccess] = useState(false);
  const [contactFormData, setContactFormData] = useState({
    fullName: '',
    email: '',
    subject: '',
    message: '',
  });

  // Video player controls state
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );

  // Promo video state
  const [promoVideoUrl, setPromoVideoUrl] = useState<string>(DEFAULT_VIDEO_URL);
  const [videoError, setVideoError] = useState(false);
  const [showVideoElement, setShowVideoElement] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [hasCustomVideo, setHasCustomVideo] = useState(false);
  const sectionVideoRef = useRef<HTMLVideoElement>(null);

  // Modal state for forms
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formConfigs, setFormConfigs] = useState<{
    player: RegistrationFormConfig | null;
    training: RegistrationFormConfig | null;
    tournament: RegistrationFormConfig | null;
    tryout: RegistrationFormConfig | null;
  }>({ player: null, training: null, tournament: null, tryout: null });
  const [activeFormIds, setActiveFormIds] = useState<Set<string>>(new Set());

  const introVideoRef = useRef<HTMLVideoElement>(null);
  const [introVideoActive, setIntroVideoActive] = useState(true);
  const [introVideoFading, setIntroVideoFading] = useState(false);
  const [needsUnmutePrompt, setNeedsUnmutePrompt] = useState(false);

  const handleIntroVideoEnd = useCallback(() => {
    setIntroVideoFading(true);
    setTimeout(() => setIntroVideoActive(false), 700);
  }, []);

  const sectionsRef = useRef<(HTMLDivElement | null)[]>([]);
  const heroRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLImageElement>(null);
  const player1Ref = useRef<HTMLImageElement>(null);
  const player2Ref = useRef<HTMLImageElement>(null);
  const player3Ref = useRef<HTMLImageElement>(null);
  const player4Ref = useRef<HTMLImageElement>(null);
  const [player3Active, setPlayer3Active] = useState(false);
  const [player4Active, setPlayer4Active] = useState(false);
  const scrollYRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const setSectionRef = (index: number) => (el: HTMLDivElement | null) => {
    sectionsRef.current[index] = el;
  };

  const [isLightTheme, setIsLightTheme] = useState(true);

  // ─── Force video mute ────────────────────────────────────────────────────────
  // This effect ensures the promo video is always muted, even when the URL changes
  // or the component re-renders
  useEffect(() => {
    const video = sectionVideoRef.current;
    if (!video) return;

    // Force mute immediately
    video.muted = true;

    // Force mute on metadata load
    const handleLoadedMetadata = () => {
      video.muted = true;
    };

    // Force mute on play
    const handlePlay = () => {
      video.muted = true;
    };

    // Force mute on volume change
    const handleVolumeChange = () => {
      if (!video.muted) {
        video.muted = true;
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('volumechange', handleVolumeChange);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [promoVideoUrl]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('registrationTheme');
    if (savedTheme) {
      setIsLightTheme(savedTheme === 'light');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = !isLightTheme;
    localStorage.setItem('registrationTheme', newTheme ? 'light' : 'dark');
    // Force a full reload so the new theme's CSS is guaranteed to apply
    // correctly instead of relying on live class-swap styling, which is
    // currently unreliable due to duplicate/conflicting theme rules.
    window.location.reload();
  }, [isLightTheme]);

  // ─── Contact form handlers ──────────────────────────────────────────────────
  const handleContactChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setContactFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingContact(true);

    try {
      const response = await fetch(`${API_BASE_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactFormData),
      });

      if (response.ok) {
        setShowContactSuccess(true);
        setContactFormData({
          fullName: '',
          email: '',
          subject: '',
          message: '',
        });

        setTimeout(() => {
          setShowContactSuccess(false);
        }, 5000);
      } else {
        const errorData = await response.json();
        console.error('Error sending message:', errorData);
        alert('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Something went wrong. Please try again later.');
    } finally {
      setIsSubmittingContact(false);
    }
  };

  // ─── Video control handlers ──────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    if (sectionVideoRef.current) {
      if (isPlaying) {
        sectionVideoRef.current.pause();
      } else {
        sectionVideoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleVolumeToggle = useCallback(() => {
    // Volume is permanently muted - do nothing
    // This function is kept but the button is commented out in the UI
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (sectionVideoRef.current) {
      setCurrentTime(sectionVideoRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (sectionVideoRef.current) {
      setDuration(sectionVideoRef.current.duration);
      // Ensure mute is applied after metadata loads
      sectionVideoRef.current.muted = true;
    }
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (sectionVideoRef.current) {
      const newTime = parseFloat(e.target.value);
      sectionVideoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, []);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout) clearTimeout(controlsTimeout);
    const timeout = setTimeout(() => {
      setShowControls(false);
    }, 3000);
    setControlsTimeout(timeout);
  }, [controlsTimeout]);

  // ─── Modal handlers ──────────────────────────────────────────────────────────
  const openFormModal = (formId: string) => {
    setSelectedFormId(formId);
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  };

  const closeFormModal = () => {
    setIsModalOpen(false);
    setSelectedFormId(null);
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  };

  // ─── Intro video handlers ────────────────────────────────────────────────────
  useEffect(() => {
    const video = introVideoRef.current;
    if (!video) return;

    // Mute the intro video by default
    video.muted = true;

    video.play().catch(() => {
      video.muted = true;
      setNeedsUnmutePrompt(true);
      video.play().catch(() => handleIntroVideoEnd());
    });
  }, [handleIntroVideoEnd]);

  const handleUnmuteTap = useCallback(() => {
    // Do nothing - keep muted
    // const video = introVideoRef.current;
    // if (video) {
    //   video.muted = false;
    // }
    // setNeedsUnmutePrompt(false);
  }, []);

  const handleRegistrationClick = useCallback(() => {
    // Wait for the form to render then scroll to it
    setTimeout(() => {
      scrollToSection('.hp-section--reg', 80);
    }, 300);
  }, []);

  // ─── Scroll activity detection ──────────────────────────────────────────────
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;

    // Preload both images for smooth transition
    const img3_2 = new Image();
    const img4_2 = new Image();
    img3_2.src = '/assets/img/theme/player3_2.png';
    img4_2.src = '/assets/img/theme/player4_2.png';

    const handleScrollActivity = () => {
      setPlayer3Active(true);
      setPlayer4Active(true);

      if (scrollTimeout) clearTimeout(scrollTimeout);

      scrollTimeout = setTimeout(() => {
        setPlayer3Active(false);
        setPlayer4Active(false);
      }, 1500);
    };

    window.addEventListener('scroll', handleScrollActivity);

    return () => {
      window.removeEventListener('scroll', handleScrollActivity);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, []);

  // ─── Scroll animations for player images and headlines ──────────────────────
  useEffect(() => {
    const handleScrollAnimations = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;

      // Animate player images based on scroll position
      const players = [
        { ref: player1Ref, start: 0, end: 500, range: [-80, 80] },
        { ref: player2Ref, start: 0, end: 500, range: [80, -80] },
      ];

      players.forEach((player) => {
        if (player.ref.current) {
          const progress = Math.max(
            0,
            Math.min(1, (scrollY - player.start) / (player.end - player.start)),
          );
          const translateX =
            player.range[0] + (player.range[1] - player.range[0]) * progress;
          player.ref.current.style.transform = `translateX(${translateX}px) translateY(${translateX * 0.3}px)`;
          player.ref.current.style.opacity = `${1 - Math.abs(progress - 0.5) * 1.5}`;
        }
      });

      // Animate headlines in each section
      const sections = document.querySelectorAll('.hp-section');
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const isVisible = rect.top < windowHeight - 100 && rect.bottom > 100;

        const headline = section.querySelector('.hp-section__head');
        if (headline && isVisible) {
          headline.classList.add('hp-headline-visible');
        } else if (headline) {
          if (rect.top > windowHeight || rect.bottom < 0) {
            headline.classList.remove('hp-headline-visible');
          }
        }
      });
    };

    window.addEventListener('scroll', handleScrollAnimations);
    handleScrollAnimations();

    return () => window.removeEventListener('scroll', handleScrollAnimations);
  }, []);

  // ─── Parallax scroll ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Store the current parallax offset for each container
    let currentPlayer3Offset = 0;
    let currentPlayer4Offset = 0;

    const handleScroll = () => {
      scrollYRef.current = window.scrollY;
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        const y = scrollYRef.current;
        const heroElement = heroRef.current;

        if (heroElement && bgRef.current) {
          const heroRect = heroElement.getBoundingClientRect();
          const heroTop = heroRect.top + window.scrollY;
          const heroHeight = heroRect.height;
          let scrollProgress = (y - heroTop) / heroHeight;
          scrollProgress = Math.max(0, Math.min(1, scrollProgress));
          const translateY = scrollProgress * 400;
          const opacity = Math.max(0, 1 - scrollProgress * 1.2);
          bgRef.current.style.transform = `translate(-50%, calc(-50% - ${translateY}px))`;
          bgRef.current.style.opacity = opacity.toString();
        }

        // Player image parallax effects
        if (player1Ref.current) {
          const yOffset = y * 0.1;
          player1Ref.current.style.transform = `translateX(${yOffset * 0.3}px) translateY(${yOffset * 0.2}px)`;
        }

        if (player2Ref.current) {
          const yOffset = y * 0.1;
          player2Ref.current.style.transform = `translateX(${-yOffset * 0.3}px) translateY(${yOffset * 0.2}px)`;
        }

        // Player3 - store the offset and always apply with current scale
        if (player3Ref.current) {
          const yOffset = y * 0.15;
          currentPlayer3Offset = yOffset;
          const container = player3Ref.current.closest(
            '.hp-player3-container',
          ) as HTMLElement;
          if (container) {
            const scale = player3Active ? 1.02 : 1;
            container.style.transform = `translateY(${currentPlayer3Offset}px) scale(${scale})`;

            const images = container.querySelectorAll('.hp-hero__player-img-3');
            images.forEach((img) => {
              const image = img as HTMLElement;
            });
          }
        }

        // Player4 - store the offset and always apply with current scale
        if (player4Ref.current) {
          const yOffset = y * 0.15;
          currentPlayer4Offset = yOffset;
          const container = player4Ref.current.closest(
            '.hp-player4-container',
          ) as HTMLElement;
          if (container) {
            const scale = player4Active ? 1.02 : 1;
            container.style.transform = `translateY(${currentPlayer4Offset}px) scale(${scale})`;

            const images = container.querySelectorAll('.hp-hero__player-img-4');
            images.forEach((img) => {
              const image = img as HTMLElement;
            });
          }
        }

        const regSection = document.querySelector('.hp-section--reg');
        if (regSection) {
          const rect = regSection.getBoundingClientRect();
          const scrollPercent =
            (window.scrollY - (rect.top + window.scrollY)) / rect.height;
          if (scrollPercent > -0.5 && scrollPercent < 1.5) {
            const bgOffset = scrollPercent * 100;
            (regSection as HTMLElement).style.setProperty(
              '--bg-offset',
              `${bgOffset}px`,
            );
          }
        }

        rafRef.current = null;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [player3Active, player4Active]);

  // ─── Intersection observer for section visibility ───────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('hp-visible');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    );
    sectionsRef.current.forEach((s) => s && observer.observe(s));
    return () => observer.disconnect();
  }, [formConfigs, activeFormIds, promoVideoUrl]);

  // ─── Fetch promo video from server ──────────────────────────────────────────
  const fetchPromoVideo = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/upload/promo-video`);
      if (!res.ok) {
        if (res.status === 404) {
          console.log('No custom video found, using default');
          setHasCustomVideo(false);
          setPromoVideoUrl(DEFAULT_VIDEO_URL);
          setShowVideoElement(true);
          return;
        }
        throw new Error('Failed to fetch');
      }

      const data = await res.json();
      if (data.videoUrl) {
        const urlWithCache = `${data.videoUrl}?t=${Date.now()}`;
        setPromoVideoUrl(urlWithCache);
        setHasCustomVideo(true);
        setShowVideoElement(true);
        setVideoLoaded(false);

        const probe = document.createElement('video');
        probe.preload = 'metadata';
        probe.src = urlWithCache;
        probe.oncanplaythrough = () => {
          setShowVideoElement(true);
        };
        probe.onerror = () => {
          console.error('Custom video failed to load, falling back to default');
          setPromoVideoUrl(DEFAULT_VIDEO_URL);
          setHasCustomVideo(false);
          setShowVideoElement(true);
        };
      } else {
        setHasCustomVideo(false);
        setPromoVideoUrl(DEFAULT_VIDEO_URL);
        setShowVideoElement(true);
      }
    } catch (error) {
      console.error('Error fetching promo video:', error);
      setHasCustomVideo(false);
      setPromoVideoUrl(DEFAULT_VIDEO_URL);
      setShowVideoElement(true);
    }
  }, []);

  // ─── Fetch active forms ──────────────────────────────────────────────────────
  const fetchActiveForms = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/forms/published`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const ids = new Set<string>(
            data.data
              .filter((f: any) => f.status === 'published')
              .map((f: any) => f._id?.toString())
              .filter(Boolean),
          );
          setActiveFormIds(ids);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const fetchAllFormConfigs = useCallback(async () => {
    try {
      let formConfigsData: Record<string, any> = {};
      let tournamentConfigs: TournamentSpecificConfig[] = [];
      let tryoutConfigs: TryoutSpecificConfig[] = [];
      try {
        const r = await fetch(`${API_BASE_URL}/admin/form-configs`);
        if (r.ok) formConfigsData = await r.json();
      } catch {
        /* ignore */
      }
      try {
        const r = await fetch(`${API_BASE_URL}/admin/tournament-configs`);
        if (r.ok) tournamentConfigs = await r.json();
      } catch {
        /* ignore */
      }
      try {
        const r = await fetch(`${API_BASE_URL}/admin/tryout-configs`);
        if (r.ok) tryoutConfigs = await r.json();
      } catch {
        /* ignore */
      }

      const configs: typeof formConfigs = {
        player: null,
        training: null,
        tournament: null,
        tryout: null,
      };

      Object.entries(formConfigsData).forEach(([key, c]: [string, any]) => {
        if (!c.isActive || c.tournamentName || c.tryoutName) return;
        const isTraining =
          key.toLowerCase().includes('training') ||
          key.toLowerCase().includes('select') ||
          (c.season && c.season.toLowerCase().includes('training')) ||
          (c.pricing?.packages && c.pricing.packages.length > 0);
        if (isTraining && !configs.training) {
          configs.training = {
            _id: c._id,
            season: c.season || key.split('-')[0],
            year:
              c.year || parseInt(key.split('-')[1]) || new Date().getFullYear(),
            isActive: c.isActive,
            requiresPayment: c.requiresPayment ?? true,
            requiresQualification: c.requiresQualification || false,
            pricing: {
              basePrice: c.pricing?.basePrice || 0,
              packages: (c.pricing?.packages || []).map((p: any) => ({
                id: p.id || p._id?.toString() || Math.random().toString(),
                name: p.name || '',
                price: p.price || 0,
                description: p.description || '',
              })),
            },
            description: c.description || '',
            displayName: c.displayName,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            __v: c.__v,
            trainingDetails: c.trainingDetails,
          };
          return;
        }
        if (!configs.player && !c.pricing?.packages?.length) {
          configs.player = {
            _id: c._id,
            season: c.season || key.split('-')[0],
            year:
              c.year || parseInt(key.split('-')[1]) || new Date().getFullYear(),
            isActive: c.isActive,
            requiresPayment: false,
            requiresQualification: false,
            pricing: { basePrice: 0, packages: [] },
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            __v: c.__v,
          };
        }
      });

      const activeTournament = tournamentConfigs.find((c) => c.isActive);
      if (activeTournament) {
        configs.tournament = {
          _id: activeTournament._id,
          season: activeTournament.tournamentName,
          year: activeTournament.tournamentYear,
          isActive: activeTournament.isActive,
          requiresPayment: true,
          requiresQualification: false,
          pricing: {
            basePrice: activeTournament.tournamentFee || 0,
            packages: [],
          },
          tournamentName: activeTournament.tournamentName,
          tournamentYear: activeTournament.tournamentYear,
          displayName: activeTournament.displayName,
          registrationDeadline: activeTournament.registrationDeadline,
          tournamentDates: activeTournament.tournamentDates || [],
          locations: activeTournament.locations || [],
          divisions: activeTournament.divisions || [],
          ageGroups: activeTournament.ageGroups || [],
          requiresRoster: activeTournament.requiresRoster || false,
          requiresInsurance: activeTournament.requiresInsurance || false,
          paymentDeadline: activeTournament.paymentDeadline,
          refundPolicy: activeTournament.refundPolicy,
          rulesDocumentUrl: activeTournament.rulesDocumentUrl,
          scheduleDocumentUrl: activeTournament.scheduleDocumentUrl,
          tournamentFee: activeTournament.tournamentFee || 0,
          createdAt: activeTournament.createdAt,
          updatedAt: activeTournament.updatedAt,
          __v: activeTournament.__v,
          description: activeTournament.description || '',
        };
      }

      const activeTryout = tryoutConfigs.find((c) => c.isActive);
      if (activeTryout) {
        const locationStrings: string[] = (activeTryout.locations || [])
          .map((loc) => loc.name)
          .filter(Boolean);
        configs.tryout = {
          _id: activeTryout._id,
          season: activeTryout.tryoutName,
          year: activeTryout.tryoutYear,
          isActive: activeTryout.isActive,
          requiresPayment: activeTryout.requiresPayment,
          requiresQualification: false,
          pricing: { basePrice: activeTryout.tryoutFee || 0, packages: [] },
          tryoutName: activeTryout.tryoutName,
          tryoutYear: activeTryout.tryoutYear,
          displayName: activeTryout.displayName,
          registrationDeadline: activeTryout.registrationDeadline,
          tryoutDates: activeTryout.tryoutDates || [],
          locations: locationStrings,
          divisions: activeTryout.divisions || [],
          ageGroups: activeTryout.ageGroups || [],
          requiresRoster: activeTryout.requiresRoster || false,
          requiresInsurance: activeTryout.requiresInsurance || false,
          paymentDeadline: activeTryout.paymentDeadline,
          refundPolicy: activeTryout.refundPolicy,
          tryoutFee: activeTryout.tryoutFee || 0,
          createdAt: activeTryout.createdAt,
          updatedAt: activeTryout.updatedAt,
          __v: activeTryout.__v,
          description: activeTryout.description || '',
          tryoutDetails: activeTryout.tryoutDetails,
        };
      }

      if (
        !configs.tournament?.isActive &&
        !configs.tryout?.isActive &&
        !configs.training?.isActive &&
        !configs.player?.isActive
      ) {
        configs.player = {
          season: 'Player Registration',
          year: new Date().getFullYear(),
          isActive: true,
          requiresPayment: false,
          requiresQualification: false,
          pricing: { basePrice: 0, packages: [] },
        };
      }
      setFormConfigs(configs);
    } catch {
      setFormConfigs({
        player: {
          season: 'Player Registration',
          year: new Date().getFullYear(),
          isActive: true,
          requiresPayment: false,
          requiresQualification: false,
          pricing: { basePrice: 0, packages: [] },
        },
        training: null,
        tournament: null,
        tryout: null,
      });
    }
  }, []);

  useEffect(() => {
    fetchActiveForms();
    fetchAllFormConfigs();
    fetchPromoVideo();
  }, [fetchActiveForms, fetchAllFormConfigs, fetchPromoVideo]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) closeFormModal();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isModalOpen]);

  const getDefaultSeasonEvent = (): SeasonEvent => {
    if (formConfigs.tournament?.isActive)
      return {
        season: formConfigs.tournament.tournamentName || 'Tournament',
        year:
          formConfigs.tournament.tournamentYear ||
          formConfigs.tournament.year ||
          2025,
        eventId:
          formConfigs.tournament._id?.toString() || 'tournament-registration',
        description:
          formConfigs.tournament.displayName || 'Tournament Registration',
      };
    if (formConfigs.tryout?.isActive)
      return {
        season: formConfigs.tryout.tryoutName || 'Tryout',
        year: formConfigs.tryout.tryoutYear || formConfigs.tryout.year || 2025,
        eventId: formConfigs.tryout._id?.toString() || 'tryout-registration',
        description: formConfigs.tryout.displayName || 'Tryout Registration',
      };
    if (formConfigs.training?.isActive)
      return {
        season: formConfigs.training.season || 'Training',
        year: formConfigs.training.year || 2025,
        eventId:
          formConfigs.training._id?.toString() || 'training-registration',
        description:
          formConfigs.training.season || 'Basketball Training Registration',
      };
    return {
      season: formConfigs.player?.season || 'Player Registration',
      year: formConfigs.player?.year || 2025,
      eventId: formConfigs.player?._id?.toString() || 'player-registration',
      description: 'Add Players to Your Account',
    };
  };

  const hasActiveEmbeddedForms = useCallback(
    () => activeFormIds.size > 0,
    [activeFormIds],
  );
  const hasActiveRegistrationForms = useCallback(
    () =>
      !!(
        formConfigs.player?.isActive ||
        formConfigs.training?.isActive ||
        formConfigs.tournament?.isActive ||
        formConfigs.tryout?.isActive
      ),
    [formConfigs],
  );

  // ─── Admin upload ────────────────────────────────────────────────────────────
  const uploadContent = useCallback(
    async (file: File) => {
      if (!file || !token) {
        setUploadError('Authentication required');
        return;
      }

      if (!file.type.startsWith('video/')) {
        setUploadError('Please upload a valid video file');
        return;
      }

      if (file.size > 200 * 1024 * 1024) {
        setUploadError('File size must be less than 200MB');
        return;
      }

      setVideoUploading(true);
      setUploadProgress(0);
      setUploadError(null);
      setUploadSuccess(false);
      setShowAdminPanel(false);

      try {
        const formData = new FormData();
        formData.append('video', file);

        const xhr = new XMLHttpRequest();

        await new Promise((resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch {
                reject(new Error('Invalid response from server'));
              }
            } else {
              try {
                const err = JSON.parse(xhr.responseText);
                reject(new Error(err.error || err.message || 'Upload failed'));
              } catch {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Network error occurred'));
          });

          xhr.addEventListener('timeout', () => {
            reject(new Error('Upload timeout'));
          });

          xhr.open('PUT', `${API_BASE_URL}/upload/promo-video`);
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.timeout = 300000;
          xhr.send(formData);
        });

        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 5000);

        setShowVideoElement(false);
        setVideoLoaded(false);
        setPromoVideoUrl('');

        await fetchPromoVideo();
      } catch (err: any) {
        console.error('Upload error:', err);
        setUploadError(
          err.message || 'Failed to upload video. Please try again.',
        );
      } finally {
        setVideoUploading(false);
      }
    },
    [token, fetchPromoVideo],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        await uploadContent(file);
      }
    },
    [uploadContent],
  );

  const resetToDefaultVideo = useCallback(async () => {
    if (!token) {
      setUploadError('Authentication required');
      return;
    }

    setVideoUploading(true);
    setUploadError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/upload/promo-video/reset`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to reset video');
      }

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 5000);

      setHasCustomVideo(false);
      setPromoVideoUrl(DEFAULT_VIDEO_URL);
      setVideoLoaded(false);
      setShowVideoElement(true);
    } catch (err: any) {
      console.error('Reset error:', err);
      setUploadError(err.message || 'Failed to reset to default video');
    } finally {
      setVideoUploading(false);
    }
  }, [token]);

  const handleVideoLoaded = useCallback(() => {
    setVideoLoaded(true);
    if (sectionVideoRef.current) {
      // Ensure mute before playing
      sectionVideoRef.current.muted = true;
      sectionVideoRef.current.play().catch((err) => {
        console.log('Auto-play prevented:', err);
        setIsPlaying(false);
      });
    }
  }, []);

  const handleVideoError = useCallback(() => {
    console.error('Video failed to load');
    setVideoError(true);
    if (hasCustomVideo) {
      console.log('Custom video failed, falling back to default');
      setHasCustomVideo(false);
      setPromoVideoUrl(DEFAULT_VIDEO_URL);
      setVideoError(false);
      setVideoLoaded(false);
    }
  }, [hasCustomVideo]);

  if (isLoading) {
    return (
      <div className='hp-loading'>
        <div className='hp-loading__spinner' />
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div
      className='hp-root'
      onDragEnter={isAdmin ? handleDrag : undefined}
      onDragLeave={isAdmin ? handleDrag : undefined}
      onDragOver={isAdmin ? handleDrag : undefined}
      onDrop={isAdmin ? handleDrop : undefined}
    >
      {/* ─── HERO SECTION ────────────────────────────────────────────────────── */}
      <section className='hp-hero' ref={heroRef}>
        {introVideoActive && (
          <div
            className={`hp-intro-video ${introVideoFading ? 'hp-intro-video--fade-out' : ''}`}
            onClick={needsUnmutePrompt ? handleUnmuteTap : undefined}
            style={{
              pointerEvents: needsUnmutePrompt ? 'auto' : 'none',
              cursor: needsUnmutePrompt ? 'pointer' : 'default',
            }}
          >
            <video
              ref={introVideoRef}
              className='hp-intro-video__player'
              src='/assets/videos/intro.mp4'
              muted={true}
              playsInline
              preload='auto'
              disablePictureInPicture
              controlsList='nodownload noplaybackrate nofullscreen'
              onEnded={handleIntroVideoEnd}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        )}
        <div className='hp-hero__bg-wrapper'>
          <img
            ref={bgRef}
            src='/assets/img/theme/bg-court.png'
            alt='Basketball court background'
            className='hp-hero__bg'
          />
        </div>
        <div className='hp-hero__overlay' />
        <div className='hp-hero__inner'>
          <div className='hp-hero__players-top'>
            <div className='hp-hero__player-left'>
              <div className='hp-hero__player-image-wrapper'>
                <img
                  ref={player1Ref}
                  src='/assets/img/theme/player1_1.png'
                  alt='Partizan Player'
                  className='hp-hero__player-img hp-hero__player-img-1'
                />
              </div>
            </div>
            <div className='hp-hero__welcome-content'>
              <span className='hp-hero__eyebrow'>
                <span className='hp-hero__eyebrow-dot' />
                Partizan Basketball Program
              </span>
              <h1 className='hp-hero__title'>
                {HERO_TITLE.split(' ').map((word, i) => (
                  <span
                    key={i}
                    className='hp-hero__word'
                    style={{ animationDelay: `${0.1 + i * 0.08}s` }}
                  >
                    {word}
                    {i < HERO_TITLE.split(' ').length - 1 ? '\u00A0' : ''}
                  </span>
                ))}
              </h1>
              <p className='hp-hero__body'>{HERO_BODY}</p>
            </div>
            <div className='hp-hero__player-right'>
              <div className='hp-hero__player-image-wrapper'>
                <img
                  ref={player2Ref}
                  src='/assets/img/theme/player2_1.png'
                  alt='Partizan Player'
                  className='hp-hero__player-img hp-hero__player-img-2'
                />
              </div>
            </div>
          </div>
          <div className='hp-hero__particles'>
            {[...Array(6)].map((_, i) => (
              <div key={i} className='particle' />
            ))}
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <main className='hp-main'>
        <div
          className={`hp-cut ${isLightTheme ? 'hp-cut--light' : ''}`}
          aria-hidden='true'
        />

        <div className='hp-main__content'>
          {/* ─── Registration Section ────────────────────────────────────────── */}
          {hasActiveRegistrationForms() && (
            <section
              className={`hp-section hp-section--reg ${isLightTheme ? 'light-theme' : 'dark-theme'}`}
              ref={setSectionRef(0)}
            >
              <div className='hp-section__inner'>
                <header className='hp-section__head'>
                  <span className='hp-section__label'>Open Now</span>
                  <h2 className='hp-section__title'>Registration</h2>
                  <p className='hp-section__sub'>
                    Secure your spot in the program
                  </p>
                  {/* Theme Toggle Button - Positioned above the registration hub */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                    }}
                  >
                    <button
                      type='button'
                      className='hp-theme-toggle'
                      onClick={toggleTheme}
                      aria-label='Toggle theme'
                    >
                      <span className='toggle-icon'>
                        {isLightTheme ? (
                          <i className='ti ti-moon'></i>
                        ) : (
                          <i className='ti ti-sun'></i>
                        )}
                      </span>

                      <span>{isLightTheme ? 'Dark Mode' : 'Light Mode'}</span>
                    </button>
                  </div>
                </header>

                <RegistrationHub
                  playerConfig={formConfigs.player}
                  trainingConfig={formConfigs.training}
                  tournamentConfig={formConfigs.tournament}
                  tryoutConfig={formConfigs.tryout}
                  seasonEvent={getDefaultSeasonEvent()}
                  onRegistrationComplete={() => {
                    fetchAllFormConfigs();
                    if (isAuthenticated) checkAuth();
                  }}
                  hasEmbeddedForms={hasActiveEmbeddedForms()}
                  onRegistrationClick={handleRegistrationClick}
                  isLightTheme={isLightTheme}
                />
              </div>
            </section>
          )}

          {/* ─── Video Section ───────────────────────────────────────────────── */}
          {showVideoElement && !videoError && (
            <section
              className='hp-section hp-section--video'
              ref={setSectionRef(1)}
            >
              <div
                className={`hp-cut-light ${isLightTheme ? 'hp-cut--light' : ''}`}
                aria-hidden='true'
              />
              <div className='hp-section__inner'>
                <header className='hp-section__head'>
                  <span className='hp-section__label'>Watch</span>
                  <h2 className='hp-section__title'>Program Highlights</h2>
                  <p className='hp-section__sub'>
                    Experience the energy and excellence of Partizan Basketball
                  </p>
                </header>
                <div
                  className='hp-video-wrapper'
                  onMouseEnter={showControlsTemporarily}
                  onMouseMove={showControlsTemporarily}
                >
                  <video
                    ref={sectionVideoRef}
                    className={`hp-video__player ${videoLoaded ? 'hp-video__player--loaded' : ''}`}
                    src={promoVideoUrl}
                    autoPlay
                    muted={true}
                    loop={false}
                    playsInline
                    preload='auto'
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    onCanPlayThrough={handleVideoLoaded}
                    onError={handleVideoError}
                    onClick={showControlsTemporarily}
                  />
                  <div
                    className={`hp-video-controls ${showControls ? 'hp-video-controls--visible' : ''}`}
                  >
                    <div className='hp-video-controls__progress'>
                      <input
                        type='range'
                        className='hp-video-controls__slider'
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                      />
                    </div>
                    <div className='hp-video-controls__buttons'>
                      <button
                        className='hp-video-controls__btn'
                        onClick={handlePlayPause}
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? (
                          <svg
                            width='20'
                            height='20'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                          >
                            <rect x='6' y='4' width='4' height='16' />
                            <rect x='14' y='4' width='4' height='16' />
                          </svg>
                        ) : (
                          <svg
                            width='20'
                            height='20'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                          >
                            <polygon points='5 3 19 12 5 21 5 3' />
                          </svg>
                        )}
                      </button>
                      <div className='hp-video-controls__time'>
                        <span>{formatTime(currentTime)}</span>
                        <span>/</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                      {hasCustomVideo && (
                        <button
                          className='hp-video-controls__btn hp-video-controls__btn--reset'
                          onClick={resetToDefaultVideo}
                          style={{ marginLeft: 'auto' }}
                        >
                          <svg
                            width='16'
                            height='16'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                          >
                            <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
                            <circle cx='12' cy='12' r='3' />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  {!videoLoaded && (
                    <div className='hp-video__shimmer'>
                      <div className='hp-video__shimmer-inner' />
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ─── Embedded Forms Section ──────────────────────────────────────── */}
          {hasActiveEmbeddedForms() && (
            <section
              className='hp-section hp-section--forms'
              ref={setSectionRef(2)}
            >
              <div className='hp-section__inner'>
                <header className='hp-section__head'>
                  <span className='hp-section__label'>Action Required</span>
                  <h2 className='hp-section__title'>Active Forms</h2>
                  <p className='hp-section__sub'>
                    Click on any form to open in a modal window
                  </p>
                </header>
                <div className='hp-forms-grid'>
                  {Array.from(activeFormIds).map((formId) => (
                    <div
                      key={formId}
                      className='hp-form-card'
                      onClick={() => openFormModal(formId)}
                    >
                      <div className='hp-form-card__icon'>
                        <svg
                          width='32'
                          height='32'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='1.5'
                        >
                          <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' />
                          <polyline points='14 2 14 8 20 8' />
                          <line x1='16' y1='13' x2='8' y2='13' />
                          <line x1='16' y1='17' x2='8' y2='17' />
                          <polyline points='10 9 9 9 8 9' />
                        </svg>
                      </div>
                      <div className='hp-form-card__info'>
                        <h4>Form #{formId.slice(-6)}</h4>
                        <p>Click to fill out this form</p>
                      </div>
                      <div className='hp-form-card__arrow'>
                        <svg
                          width='20'
                          height='20'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                        >
                          <path d='M5 12h14M12 5l7 7-7 7' />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ─── Spotlight Section ───────────────────────────────────────────── */}
          <section
            className='hp-section hp-section--spotlight'
            ref={setSectionRef(3)}
          >
            <div className='hp-hero__particles'>
              {[...Array(6)].map((_, i) => (
                <div key={i} className='particle' />
              ))}
            </div>
            <div className='hp-cut-mirror' aria-hidden='true' />
            <div className='hp-hero__player-player4'>
              <div className='hp-hero__player-image-wrapper-player4'>
                <div className='hp-player-image-container hp-player4-container'>
                  <img
                    ref={player4Ref}
                    src='/assets/img/theme/player4_1.png'
                    alt='Partizan Player Action'
                    className={`hp-hero__player-img hp-hero__player-img-4 ${!player4Active ? 'hp-player-visible' : 'hp-player-hidden'}`}
                  />
                  <img
                    src='/assets/img/theme/player4_2.png'
                    alt='Partizan Player Action'
                    className={`hp-hero__player-img hp-hero__player-img-4 hp-player-overlay ${player4Active ? 'hp-player-visible' : 'hp-player-hidden'}`}
                  />
                </div>
              </div>
            </div>
            <div className='hp-section__inner'>
              <header className='hp-section__head'>
                <span className='hp-section__label'>Latest</span>
                <h2 className='hp-section__title'>In the Spotlight</h2>
                <p className='hp-section__sub'>
                  Featured highlights from the program
                </p>
              </header>
              <SpotlightContent
                limit={3}
                showTitle={false}
                title='In The Spotlight'
                showViewAll={true}
                viewAllLink='/in-the-spotlight'
                featuredOnly={false}
                showImageModal={true}
              />
            </div>
          </section>

          {/* ─── Events Section ───────────────────────────────────────────────── */}
          <section
            className='hp-section hp-section--events'
            ref={setSectionRef(4)}
          >
            <div className='hp-cut-mirror-dark' aria-hidden='true' />
            <div className='hp-hero__player-player3'>
              <div className='hp-hero__player-image-wrapper-player3'>
                <div className='hp-player-image-container hp-player3-container'>
                  <img
                    ref={player3Ref}
                    src='/assets/img/theme/player3_1.png'
                    alt='Partizan Player Action'
                    className={`hp-hero__player-img hp-hero__player-img-3 ${!player3Active ? 'hp-player-visible' : 'hp-player-hidden'}`}
                  />
                  <img
                    src='/assets/img/theme/player3_2.png'
                    alt='Partizan Player Action'
                    className={`hp-hero__player-img hp-hero__player-img-3 hp-player-overlay ${player3Active ? 'hp-player-visible' : 'hp-player-hidden'}`}
                  />
                </div>
              </div>
            </div>
            <div className='hp-section__inner'>
              <header className='hp-section__head'>
                <span className='hp-section__label'>Calendar</span>
                <h2 className='hp-section__title'>Upcoming Events</h2>
                <p className='hp-section__sub'>
                  Don't miss out on what's coming
                </p>
              </header>
              <TodayEvents />
            </div>
          </section>

          {/* ─── About Us Section ────────────────────────────────────────────── */}
          <section
            className='hp-section hp-section--about'
            ref={setSectionRef(5)}
          >
            <div className='hp-cut-reverse-light' aria-hidden='true' />
            <div className='hp-section__inner'>
              <div className='hp-about-wrapper'>
                <div className=''>
                  <img
                    src='/assets/img/watermark-logo.png'
                    alt='Partizan Basketball'
                  />
                </div>
                <div className='hp-about-content'>
                  <header className='hp-section__head'>
                    <span className='hp-section__label'>
                      Where Passion, Growth, and Basketball Come Together
                    </span>
                    <h2 className='hp-section__title'>About Partizan</h2>
                    <p className='hp-section__sub'>
                      Building Champions On and Off the Court
                    </p>
                  </header>
                  <div className='hp-about-text'>
                    <p className='hp-about-paragraph'>
                      Join a thriving basketball community where passion,
                      teamwork, and player development come together. Learn from
                      experienced coaches, build lasting friendships, and
                      elevate your game in a fun, competitive, and supportive
                      environment.
                    </p>
                    <div className='hp-about-highlights'>
                      <div className='hp-highlight-item'>
                        <svg
                          width='24'
                          height='24'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                        >
                          <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14' />
                          <polyline points='22 4 12 14.01 9 11.01' />
                        </svg>
                        <span>Elite Training Programs</span>
                      </div>
                      <div className='hp-highlight-item'>
                        <svg
                          width='24'
                          height='24'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                        >
                          <path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' />
                          <circle cx='12' cy='7' r='4' />
                        </svg>
                        <span>Expert Coaching Staff</span>
                      </div>
                      <div className='hp-highlight-item'>
                        <svg
                          width='24'
                          height='24'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                        >
                          <path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' />
                          <circle cx='9' cy='7' r='4' />
                          <path d='M23 21v-2a4 4 0 0 0-3-3.87' />
                          <path d='M16 3.13a4 4 0 0 1 0 7.75' />
                        </svg>
                        <span>Youth Development Focus</span>
                      </div>
                    </div>
                    <p className='hp-about-paragraph'>
                      Whether you're looking for your young athlete to sharpen
                      their skills, gain confidence on the court, or simply
                      enjoy the game they love, our programs deliver an
                      experience your kids will never forget.
                    </p>
                    <div className='hp-about-cta'>
                      <button
                        className='hp-btn-primary'
                        onClick={() => navigate('/about-us')}
                      >
                        Learn More About Us
                        <svg
                          width='18'
                          height='18'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                        >
                          <path d='M5 12h14M12 5l7 7-7 7' />
                        </svg>
                      </button>
                      <button
                        className='hp-btn-secondary'
                        onClick={() => navigate('/contact-us')}
                      >
                        Contact Us
                      </button>
                    </div>
                    <p className='hp-about-footer-text'>
                      Explore our website to learn more about our camps,
                      coaching staff, registration opportunities, and upcoming
                      sessions. If you have any questions, we're always happy to
                      help.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ─── Contact Us Section ──────────────────────────────────────────── */}
          <section
            className='hp-section hp-section--contact'
            ref={setSectionRef(6)}
          >
            <div className='hp-cut-reverse-dark' aria-hidden='true' />
            <div className='hp-section__inner'>
              <div className='hp-contact-wrapper'>
                <div className='hp-contact-content'>
                  <header className='hp-section__head'>
                    <span className='hp-section__label'>
                      Get in Touch With Us
                    </span>
                    <h2 className='hp-section__title'>Contact Partizan</h2>
                    <p className='hp-section__sub'>
                      We're Here to Answer Your Questions
                    </p>
                  </header>

                  <div className='hp-contact-text'>
                    <p className='hp-contact-paragraph'>
                      Have questions about our programs, registration, or
                      upcoming events? Our team is ready to assist you. Reach
                      out to us through any of the channels below or fill out
                      the contact form.
                    </p>

                    <div className='hp-contact-methods'>
                      <div className='hp-contact-item'>
                        <svg
                          width='24'
                          height='24'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                        >
                          <path d='M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z' />
                        </svg>
                        <div>
                          <h4>Phone</h4>
                          <p>(425) 375-5235</p>
                        </div>
                      </div>

                      <div className='hp-contact-item'>
                        <svg
                          width='24'
                          height='24'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                        >
                          <path d='M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z' />
                          <polyline points='22,6 12,13 2,6' />
                        </svg>
                        <div>
                          <h4>Email</h4>
                          <p>partizanhoops@proton.me</p>
                        </div>
                      </div>

                      <div className='hp-contact-item'>
                        <svg
                          width='24'
                          height='24'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                        >
                          <rect x='2' y='4' width='20' height='16' rx='2' />
                          <path d='M22 7l-10 7L2 7' />
                        </svg>
                        <div>
                          <h4>Hours</h4>
                          <p>
                            Mon-Fri: 9am - 6pm
                            <br />
                            Sat: 10am - 4pm
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className='hp-contact-image'>
                  <div className='hp-contact-logo-wrapper'>
                    <div className='hp-contact-form'>
                      {showContactSuccess ? (
                        <div className='hp-contact-success-message'>
                          <div className='hp-contact-success-icon'>
                            <svg
                              width='48'
                              height='48'
                              viewBox='0 0 24 24'
                              fill='none'
                              stroke='currentColor'
                              strokeWidth='2'
                            >
                              <circle cx='12' cy='12' r='10' />
                              <path d='M8 12l3 3 6-6' />
                            </svg>
                          </div>
                          <h3>Message Sent Successfully!</h3>
                          <p>
                            Thank you for reaching out. We've received your
                            message and will get back to you shortly!
                          </p>
                        </div>
                      ) : (
                        <>
                          <h3>Send Us a Message</h3>
                          <form onSubmit={handleContactSubmit}>
                            <div className='hp-form-row'>
                              <div className='hp-form-group'>
                                <input
                                  type='text'
                                  name='fullName'
                                  value={contactFormData.fullName}
                                  onChange={handleContactChange}
                                  placeholder='Your Name'
                                  required
                                />
                              </div>
                              <div className='hp-form-group'>
                                <input
                                  type='email'
                                  name='email'
                                  value={contactFormData.email}
                                  onChange={handleContactChange}
                                  placeholder='Your Email'
                                  required
                                />
                              </div>
                            </div>
                            <div className='hp-form-group'>
                              <input
                                type='text'
                                name='subject'
                                value={contactFormData.subject}
                                onChange={handleContactChange}
                                placeholder='Subject'
                                required
                              />
                            </div>
                            <div className='hp-form-group'>
                              <textarea
                                name='message'
                                value={contactFormData.message}
                                onChange={handleContactChange}
                                rows={4}
                                placeholder='Your Message'
                                required
                              ></textarea>
                            </div>
                            <button
                              type='submit'
                              className='hp-btn-primary'
                              disabled={isSubmittingContact}
                            >
                              {isSubmittingContact
                                ? 'Sending...'
                                : 'Send Message'}
                              <svg
                                width='18'
                                height='18'
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                              >
                                <path d='M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z' />
                              </svg>
                            </button>
                          </form>
                          <p className='hp-contact-footer-text'>
                            We typically respond within 24-48 hours. For urgent
                            matters, please call us directly.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className='hp-footer-band'>
          <span>Partizan AAU</span>
          <span className='hp-footer-band__sep'>·</span>
          <span>Developing champions on and off the court</span>
        </div>
      </main>

      {/* ─── FORM MODAL ──────────────────────────────────────────────────────── */}
      {isModalOpen && selectedFormId && (
        <div className='hp-modal-overlay' onClick={closeFormModal}>
          <div className='hp-modal' onClick={(e) => e.stopPropagation()}>
            <div className='hp-modal__header'>
              <h3>Complete Form</h3>
              <button className='hp-modal__close' onClick={closeFormModal}>
                <svg
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <path d='M18 6L6 18M6 6l12 12' />
                </svg>
              </button>
            </div>
            <div className='hp-modal__body'>
              <FormEmbed
                formId={selectedFormId}
                isActive={true}
                wrapperClassName='hp-modal-form'
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── ADMIN PANEL ────────────────────────────────────────────────────── */}
      {isAdmin && (
        <>
          <button
            className={`hp-admin-toggle ${showAdminPanel ? 'is-open' : ''}`}
            onClick={() => setShowAdminPanel((v) => !v)}
            title='Content management'
          >
            <svg
              width='18'
              height='18'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <circle cx='12' cy='12' r='3' />
              <path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' />
            </svg>
          </button>
          {showAdminPanel && (
            <div className='hp-admin'>
              <div className='hp-admin__head'>
                <span>Video Management</span>
                <button onClick={() => setShowAdminPanel(false)}>
                  <svg
                    width='16'
                    height='16'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2.5'
                  >
                    <path d='M18 6 6 18M6 6l12 12' />
                  </svg>
                </button>
              </div>
              <div className='hp-admin__body'>
                {uploadSuccess && (
                  <div className='hp-admin__ok'>
                    <svg
                      width='14'
                      height='14'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2.5'
                    >
                      <polyline points='20 6 9 17 4 12' />
                    </svg>
                    Video updated successfully!
                  </div>
                )}
                <div
                  className={`hp-admin__drop ${dragActive ? 'is-over' : ''}`}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'video/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) uploadContent(file);
                    };
                    input.click();
                  }}
                >
                  <svg
                    width='32'
                    height='32'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.5'
                  >
                    <polyline points='16 16 12 12 8 16' />
                    <line x1='12' y1='12' x2='12' y2='21' />
                    <path d='M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3' />
                  </svg>
                  <p>Drop video or click to upload</p>
                  <small>MP4, MOV, or WebM • Max 200MB</small>
                </div>
                {videoUploading && (
                  <div className='hp-admin__prog'>
                    <div className='hp-admin__prog-track'>
                      <div
                        className='hp-admin__prog-bar'
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <span>
                      {uploadProgress < 100
                        ? `Uploading: ${uploadProgress}%`
                        : 'Processing video...'}
                    </span>
                  </div>
                )}
                {uploadError && (
                  <div className='hp-admin__err'>
                    <span>⚠️ {uploadError}</span>
                    <button onClick={() => setUploadError(null)}>×</button>
                  </div>
                )}
                <div className='hp-admin__status'>
                  <span>Current video:</span>
                  <span
                    className={hasCustomVideo ? 'is-active' : 'is-inactive'}
                  >
                    {hasCustomVideo ? '✓ Custom Video' : 'Default Video'}
                  </span>
                </div>
                {hasCustomVideo && (
                  <button
                    className='hp-admin__reset-btn'
                    onClick={resetToDefaultVideo}
                    disabled={videoUploading}
                  >
                    <svg
                      width='14'
                      height='14'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                    >
                      <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
                      <circle cx='12' cy='12' r='3' />
                    </svg>
                    Reset to Default Video
                  </button>
                )}
              </div>
            </div>
          )}
          {dragActive && (
            <div className='hp-drop-shield'>
              <svg
                width='48'
                height='48'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.5'
              >
                <polyline points='16 16 12 12 8 16' />
                <line x1='12' y1='12' x2='12' y2='21' />
                <path d='M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3' />
              </svg>
              <p>Drop video file to upload</p>
            </div>
          )}
        </>
      )}

      <HomeModals />
    </div>
  );
};

export default HomePage;

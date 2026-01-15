import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useAuth } from '../../context/AuthContext';
import ImageWithBasePath from '../../core/common/imageWithBasePath';
import HomeModals from './homeModals';
import SponsorSplashScreen from '../components/SponsorSplashScreen';
import PageRenderer from '../../components/page-builder/PageRenderer';

interface HomePageProps {
  onSplashClose: () => void;
}

interface VideoControls {
  isPlaying: boolean;
  isFullscreen: boolean;
}

const HomePage: React.FC<HomePageProps> = ({ onSplashClose }) => {
  const { isLoading } = useAuth();

  // Video state and refs
  const [videoControls, setVideoControls] = useState<VideoControls>({
    isPlaying: false,
    isFullscreen: false,
  });
  const [showVideoControls, setShowVideoControls] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoControlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const lastRoundedProgress = useRef<number>(0);

  // ============ VIDEO CONTROLS FUNCTIONS ============
  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.muted = true;
        videoRef.current
          .play()
          .then(() => {
            setVideoControls((prev) => ({ ...prev, isPlaying: true }));
          })
          .catch((err) => {
            console.log('Play failed:', err);
            videoRef.current!.muted = true;
          });
      } else {
        videoRef.current.pause();
        setVideoControls((prev) => ({ ...prev, isPlaying: false }));
      }
    }
  }, []);

  const handleProgressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const progress = parseFloat(e.target.value);
      const roundedProgress = Math.round(progress);
      setVideoProgress(roundedProgress);

      if (videoRef.current && videoDuration > 0) {
        const time = (roundedProgress / 100) * videoDuration;
        videoRef.current.currentTime = time;
        lastRoundedProgress.current = roundedProgress;
      }
    },
    [videoDuration]
  );

  const toggleFullscreen = useCallback(() => {
    if (!videoRef.current) return;

    const container = videoRef.current.parentElement;
    if (!container) return;

    if (!videoControls.isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
      setVideoControls((prev) => ({ ...prev, isFullscreen: true }));
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setVideoControls((prev) => ({ ...prev, isFullscreen: false }));
    }
  }, [videoControls.isFullscreen]);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current || !videoDuration) return;

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }

    animationFrameId.current = requestAnimationFrame(() => {
      const currentTime = videoRef.current!.currentTime;
      const rawProgress = (currentTime / videoDuration) * 100;
      const roundedProgress = Math.round(rawProgress);

      if (Math.abs(roundedProgress - lastRoundedProgress.current) >= 1) {
        setVideoProgress(roundedProgress);
        lastRoundedProgress.current = roundedProgress;
      }
    });
  }, [videoDuration]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
      if (!videoControls.isPlaying) {
        videoRef.current.muted = true;
        videoRef.current
          .play()
          .then(() => {
            setVideoControls((prev) => ({ ...prev, isPlaying: true }));
          })
          .catch((err) => {
            console.log('Autoplay prevented:', err);
          });
      }
    }
  }, [videoControls.isPlaying]);

  const handleVideoClick = useCallback(() => {
    togglePlayPause();
    showControlsTemporarily();
  }, [togglePlayPause]);

  const showControlsTemporarily = useCallback(() => {
    setShowVideoControls(true);

    if (videoControlsTimeout.current) {
      clearTimeout(videoControlsTimeout.current);
    }

    videoControlsTimeout.current = setTimeout(() => {
      setShowVideoControls(false);
    }, 3000);
  }, []);

  const handleMouseMove = useCallback(() => {
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  const stableVideoProgress = useMemo(() => {
    return Math.round(videoProgress);
  }, [videoProgress]);

  // ============ EFFECTS ============
  useEffect(() => {
    // Fullscreen change listener
    const handleFullscreenChange = () => {
      setVideoControls((prev) => ({
        ...prev,
        isFullscreen: !!document.fullscreenElement,
      }));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);

      if (videoControlsTimeout.current) {
        clearTimeout(videoControlsTimeout.current);
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  useEffect(() => {
    // Try to autoplay video
    const startVideo = async () => {
      if (videoRef.current) {
        try {
          videoRef.current.muted = true;
          videoRef.current.loop = true;

          if (videoRef.current.readyState < 2) {
            await new Promise((resolve) => {
              videoRef.current!.addEventListener('loadeddata', resolve, {
                once: true,
              });
            });
          }

          await videoRef.current.play();
          setVideoControls((prev) => ({ ...prev, isPlaying: true }));
        } catch (error) {
          console.log('Autoplay was prevented:', error);
        }
      }
    };

    const timer = setTimeout(startVideo, 1000);
    return () => clearTimeout(timer);
  }, []);

  // ============ RENDER ============
  if (isLoading) {
    return (
      <div className='container-fluid'>
        <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
          <div className='row justify-content-center align-items-center vh-100'>
            <div className='text-center'>
              <div className='spinner-border text-primary' role='status'>
                <span className='visually-hidden'>Loading...</span>
              </div>
              <p className='mt-3'>Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='container-fluid'>
      {/* <SponsorSplashScreen onClose={onSplashClose} /> */}
      <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
        <div className='row'>
          {/* Left Column - Video */}
          <div className='col-lg-6 position-relative overflow-hidden'>
            <div
              className='video-background-container position-relative w-100 h-100 d-flex align-items-center justify-content-center striped-bg'
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setShowVideoControls(true)}
              onMouseLeave={() => {
                if (!videoControls.isPlaying) return;
                setShowVideoControls(false);
              }}
            >
              <video
                ref={videoRef}
                className='video-background'
                src='/assets/videos/partizan.mp4'
                autoPlay
                muted
                loop
                playsInline
                preload='auto'
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onClick={handleVideoClick}
                onCanPlay={() => {
                  console.log('Video can play');
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  zIndex: 1,
                  backgroundColor: '#000',
                }}
              />

              {/* Overlay Image */}
              <div
                className='position-absolute d-flex align-items-center justify-content-center w-100 h-100'
                style={{ zIndex: 2 }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    maxHeight: '80%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ImageWithBasePath
                    src='assets/img/watermark-logo.png'
                    alt='Partizan AAU Basketball'
                    className='img-fluid hover-zoom'
                  />
                </div>
              </div>

              {/* Video Controls */}
              <div
                className={`video-controls-overlay position-absolute bottom-0 left-0 right-0 transition-all ${
                  showVideoControls
                    ? 'opacity-100'
                    : 'opacity-0 pointer-events-none'
                }`}
                style={{
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.4))',
                  padding: '10px 16px',
                  zIndex: 3,
                  transition: 'opacity 0.3s ease, transform 0.3s ease',
                  transform: showVideoControls
                    ? 'translateY(0)'
                    : 'translateY(10px)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className='d-flex align-items-center justify-content-between'>
                  <button
                    onClick={togglePlayPause}
                    className='btn btn-transparent btn-sm rounded-circle d-flex align-items-center justify-content-center'
                    style={{
                      width: '36px',
                      height: '36px',
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: 'white',
                      transition: 'all 0.2s ease',
                      marginRight: '10px',
                    }}
                  >
                    {videoControls.isPlaying ? (
                      <svg
                        width='20'
                        height='20'
                        viewBox='0 0 24 24'
                        fill='currentColor'
                      >
                        <rect x='6' y='5' width='4' height='14' rx='1' />
                        <rect x='14' y='5' width='4' height='14' rx='1' />
                      </svg>
                    ) : (
                      <svg
                        width='20'
                        height='20'
                        viewBox='0 0 24 24'
                        fill='currentColor'
                      >
                        <path d='M8 5v14l11-7z' />
                      </svg>
                    )}
                  </button>

                  <div className='mt-1 mb-2 flex-grow-1'>
                    <input
                      type='range'
                      min='0'
                      max='100'
                      value={stableVideoProgress}
                      onChange={handleProgressChange}
                      className='w-100 video-progress-slider'
                      style={{
                        height: '3px',
                        borderRadius: '1.5px',
                        background: `linear-gradient(to right, rgba(255,255,255,0.9) ${videoProgress}%, rgba(255,255,255,0.2) ${stableVideoProgress}%)`,
                        WebkitAppearance: 'none',
                        appearance: 'none',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    />
                    <div
                      className='d-flex justify-content-between text-white mt-1'
                      style={{ fontSize: '0.75rem', opacity: 0.8 }}
                    >
                      <small>
                        {formatTime(
                          (stableVideoProgress / 100) * videoDuration
                        )}
                      </small>
                      <small>{formatTime(videoDuration)}</small>
                    </div>
                  </div>

                  <button
                    onClick={toggleFullscreen}
                    className='btn btn-transparent btn-sm rounded-circle d-flex align-items-center justify-content-center'
                    style={{
                      width: '36px',
                      height: '36px',
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: 'white',
                      transition: 'all 0.2s ease',
                      marginLeft: '10px',
                    }}
                  >
                    {videoControls.isFullscreen ? (
                      <svg
                        width='20'
                        height='20'
                        viewBox='0 0 24 24'
                        fill='currentColor'
                      >
                        <path d='M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z' />
                      </svg>
                    ) : (
                      <svg
                        width='20'
                        height='20'
                        viewBox='0 0 24 24'
                        fill='currentColor'
                      >
                        <path d='M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z' />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Play button overlay when paused */}
              {!videoControls.isPlaying && (
                <button
                  onClick={togglePlayPause}
                  className='btn btn-transparent btn-lg rounded-circle position-absolute d-flex align-items-center justify-content-center'
                  style={{
                    width: '60px',
                    height: '60px',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 3,
                    opacity: showVideoControls ? 1 : 0.7,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: 'white',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <svg
                    width='28'
                    height='28'
                    viewBox='0 0 24 24'
                    fill='currentColor'
                  >
                    <path d='M8 5v14l11-7z' />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Right Column - Dynamic Content via PageRenderer */}
          <div className='col-lg-6 col-md-12 col-sm-12'>
            <div className='row justify-content-center align-items-center vh-100 overflow-auto flex-wrap'>
              <div className='home-page'>
                <div className='mx-auto'>
                  <PageRenderer pageSlug='home' isEditing={false} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sponsor Banner (keep this if needed) */}
      <div className='footer-container'>
        <div
          className='mobile-ad-banner bg-white shadow-lg p-2 md:hidden'
          style={{
            position: 'relative',
            width: '100%',
            bottom: 0,
            left: 0,
            right: 0,
          }}
        >
          {/* <div className='sponsor-container'>
            <a
              href='https://concreterestorationinc.com/'
              target='_blank'
              rel='noopener noreferrer'
              className='sponsor-item'
            >
              <img
                src='assets/img/sponsor_logo_mobile.png'
                alt='Concrete Restoration Inc.'
                className='mobile-ad-logo'
                onError={(e) => {
                  e.currentTarget.src = 'assets/img/fallback_logo.png';
                }}
              />
            </a>
            <a
              href='https://www.grshsolution.com/'
              target='_blank'
              rel='noopener noreferrer'
              className='sponsor-item'
            >
              <img
                src='assets/img/sponsor_logo_mobile_2.png'
                alt='GR Solution'
                className='mobile-ad-logo'
                onError={(e) => {
                  e.currentTarget.src = 'assets/img/fallback_logo.png';
                }}
              />
            </a>
          </div> */}
        </div>
      </div>

      <HomeModals />

      <style>{`
       .striped-bg {
          position: relative;
        }

         .striped-bg::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: 
            /* Stripe 1: Colored */
            linear-gradient(
              90deg,
              rgba(89, 66, 48, .035) 0%,
              rgba(89, 66, 48, .035) 14.2857%,
              transparent 14.2857%
            ),
            /* Stripe 2: White */
            linear-gradient(
              90deg,
              #ffffff 14.2857%,
              #ffffff 28.5714%,
              transparent 28.5714%
            ),
            /* Stripe 3: Colored */
            linear-gradient(
              90deg,
              rgba(89, 66, 48, .035) 28.5714%,
              rgba(89, 66, 48, .035) 42.8571%,
              transparent 42.8571%
            ),
            /* Stripe 4: White */
            linear-gradient(
              90deg,
              #ffffff 42.8571%,
              #ffffff 57.1428%,
              transparent 57.1428%
            ),
            /* Stripe 5: Colored */
            linear-gradient(
              90deg,
              rgba(89, 66, 48, .035) 57.1428%,
              rgba(89, 66, 48, .035) 71.4285%,
              transparent 71.4285%
            ),
            /* Stripe 6: White */
            linear-gradient(
              90deg,
              #ffffff 71.4285%,
              #ffffff 85.7142%,
              transparent 85.7142%
            ),
            /* Stripe 7: Colored */
            linear-gradient(
              90deg,
              rgba(89, 66, 48, .035) 85.7142%,
              rgba(89, 66, 48, .035) 100%
            );
          background-size: 100% 100%;
          background-repeat: no-repeat;
          z-index: 1;
        }

        /* Ensure the image sits above the stripes */
        .striped-bg img {
          position: relative;
          z-index: 2;
          max-width: 80%;
          max-height: 80%;
          object-fit: contain;
        }

        /* Hover zoom effect for the image */
        .hover-zoom {
          transition: transform 0.3s ease;
        }
        
        .hover-zoom:hover {
          transform: scale(1.05);
        }

        /* Responsive styles */
        @media (max-width: 991.98px) {
          .col-lg-6:first-child {
            display: none !important;
          }
        }

        /* Alternative method using CSS custom properties */
        /* This is cleaner and more maintainable */
        .striped-bg-alt {
          position: relative;
        }

        .striped-bg-alt::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          --stripe-width: calc(100% / 7);
          background-image: repeating-linear-gradient(
            90deg,
            rgba(89, 66, 48, .035) 0 var(--stripe-width),
            #ffffff var(--stripe-width) calc(var(--stripe-width) * 2),
            rgba(89, 66, 48, .035) calc(var(--stripe-width) * 2) calc(var(--stripe-width) * 3),
            #ffffff calc(var(--stripe-width) * 3) calc(var(--stripe-width) * 4),
            rgba(89, 66, 48, .035) calc(var(--stripe-width) * 4) calc(var(--stripe-width) * 5),
            #ffffff calc(var(--stripe-width) * 5) calc(var(--stripe-width) * 6),
            rgba(89, 66, 48, .035) calc(var(--stripe-width) * 6) 100%
          );
          z-index: 1;
        }
      `}</style>
    </div>
  );
};

export default HomePage;

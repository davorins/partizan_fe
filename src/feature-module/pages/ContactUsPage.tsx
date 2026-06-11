import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageWithBasePath from '../../core/common/imageWithBasePath';
import './ContactPage.css';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const navigate = useNavigate();

  useEffect(() => {
    // Preload image and trigger entrance animation
    const img = new Image();
    img.src = 'assets/img/theme/player5_1.png';
    img.onload = () => {
      setIsImageLoaded(true);
    };

    // Fallback: set loaded after a short delay even if image doesn't trigger onload
    const timer = setTimeout(() => {
      setIsImageLoaded(true);
    }, 500);

    // Mouse move effect for parallax
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowSuccess(true);
        setFormData({
          fullName: '',
          email: '',
          subject: '',
          message: '',
        });

        setTimeout(() => {
          navigate('/');
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
      setIsSubmitting(false);
    }
  };

  return (
    <div className='contact-white-container'>
      {/* Background Image - Full page background with dramatic entrance */}
      <div
        className={`contact-background-image ${isImageLoaded ? 'loaded' : ''}`}
      >
        <div
          className='contact-bg-parallax'
          style={{
            transform: `translate(${(mousePosition.x - 50) * -0.02}px, ${(mousePosition.y - 50) * -0.02}px)`,
          }}
        >
          <ImageWithBasePath
            src='assets/img/theme/player5_1.png'
            alt='Background'
            className='contact-bg-img'
          />
        </div>
        <div className='contact-bg-overlay' />
        <div className='contact-bg-gradient-overlay' />
      </div>

      {/* Animated gradient orbs - subtle for white theme */}
      <div className='contact-orb-white contact-orb-white-1' />
      <div className='contact-orb-white contact-orb-white-2' />
      <div className='contact-orb-white contact-orb-white-3' />

      {/* Floating particles */}
      <div className='contact-particles'>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className='contact-particle'
            style={{
              animationDelay: `${i * 0.5}s`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${3 + Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <div className='contact-content-wrapper-white'>
        <div className='contact-grid-white'>
          {/* Left side - Empty for balance */}
          <div className='contact-left-empty' />

          {/* Right side - Contact Form with entrance animation */}
          <div className='contact-form-wrapper-white'>
            <div className='contact-form-card-white'>
              {showSuccess ? (
                <div className='contact-success-message-white'>
                  <div className='success-icon-white'>
                    <i className='ti ti-circle-check' />
                  </div>
                  <h2>Message Sent Successfully!</h2>
                  <p>
                    Thank you for reaching out. We've received your message and
                    will get back to you shortly!
                  </p>
                  <div className='success-animation-white' />
                </div>
              ) : (
                <>
                  <div className='contact-header-white'>
                    <div className='contact-header-icon-white'>
                      <i className='ti ti-mail-heart' />
                    </div>
                    <h1>Reach Out!</h1>
                    <p>
                      Whether you have questions about camp registration,
                      practice schedules, skill levels, or training programs —
                      don't hesitate to reach out. Our team is dedicated to
                      helping every player grow on and off the court.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className='contact-form-white'>
                    <div className='form-group-white'>
                      <label className='form-label-white'>
                        <i className='ti ti-user' />
                        Full Name
                      </label>
                      <input
                        type='text'
                        name='fullName'
                        className='form-control-white'
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                        placeholder='Enter your full name'
                      />
                    </div>

                    <div className='form-group-white'>
                      <label className='form-label-white'>
                        <i className='ti ti-mail' />
                        Email Address
                      </label>
                      <input
                        type='email'
                        name='email'
                        className='form-control-white'
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder='you@example.com'
                      />
                    </div>

                    <div className='form-group-white'>
                      <label className='form-label-white'>
                        <i className='ti ti-article' />
                        Subject
                      </label>
                      <input
                        type='text'
                        name='subject'
                        className='form-control-white'
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        placeholder="What's this about?"
                      />
                    </div>

                    <div className='form-group-white'>
                      <label className='form-label-white'>
                        <i className='ti ti-message' />
                        Message
                      </label>
                      <textarea
                        name='message'
                        className='form-control-white form-textarea-white'
                        value={formData.message}
                        onChange={handleChange}
                        required
                        placeholder='Tell us how we can help...'
                        rows={5}
                      />
                    </div>

                    <button
                      type='submit'
                      className='contact-submit-btn-white'
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className='spinner-white' />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Message
                          <i className='ti ti-arrow-right' />
                        </>
                      )}
                    </button>
                  </form>

                  <div className='contact-footer-white'>
                    <div className='contact-footer-content-white'>
                      <h3>Connect With Us!</h3>
                      <p>
                        Stay connected on social media for the latest news,
                        updates, and more:
                      </p>
                      <div className='social-links-white'>
                        <a href='#' className='social-link-white'>
                          <i className='ti ti-brand-facebook' />
                        </a>
                        <a href='#' className='social-link-white'>
                          <i className='ti ti-brand-instagram' />
                        </a>
                        <a href='#' className='social-link-white'>
                          <i className='ti ti-brand-twitter' />
                        </a>
                        <a href='#' className='social-link-white'>
                          <i className='ti ti-brand-youtube' />
                        </a>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;

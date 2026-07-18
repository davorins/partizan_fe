// Footer.tsx

import React from 'react';
import { Link } from 'react-router-dom';

const currentYear = new Date().getFullYear();

const Footer = () => {
  return (
    <footer className='footer'>
      <div className='copyright'>
        © {currentYear} Partizan by{' '}
        <a href='https://rainbootsmarketing.com/'>Rainboots</a>
      </div>
      {/* Social Media Section */}
      <div className='footer-socials'>
        <a
          href='https://www.instagram.com/partizanhoopsaau/'
          target='_blank'
          rel='noopener noreferrer'
          className='social-icon instagram'
          aria-label='Instagram'
        >
          <i className='ti ti-brand-instagram'></i>
        </a>
        <a
          href='https://www.facebook.com/profile.php?id=61591912024867'
          target='_blank'
          rel='noopener noreferrer'
          className='social-icon facebook'
          aria-label='Facebook'
        >
          <i className='ti ti-brand-facebook'></i>
        </a>
        <a
          href='https://twitter.com/partizanhoops'
          target='_blank'
          rel='noopener noreferrer'
          className='social-icon twitter'
          aria-label='Twitter'
        >
          <i className='ti ti-brand-x'></i>
        </a>
        <a
          href='https://www.youtube.com/@partizanhoops'
          target='_blank'
          rel='noopener noreferrer'
          className='social-icon youtube'
          aria-label='YouTube'
        >
          <i className='ti ti-brand-youtube'></i>
        </a>
      </div>
      <div className='footer-links'>
        <Link to='/privacy-policy'>
          <i className='ti ti-lock'></i>
          <span className='link-text'>Privacy Policy</span>
        </Link>
        <Link to='/terms-conditions'>
          <i className='ti ti-file-text'></i>
          <span className='link-text'>Terms and Conditions</span>
        </Link>
      </div>
    </footer>
  );
};

export default Footer;

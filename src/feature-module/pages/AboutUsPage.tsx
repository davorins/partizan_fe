import React from 'react';
import ImageWithBasePath from '../../core/common/imageWithBasePath';
import PageRenderer from '../../components/page-builder/PageRenderer';

const AboutUsPage = () => {
  return (
    <div className='container-fuild'>
      <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
        <div className='row'>
          {/* Left Column - Fixed Image with Striped Background */}
          <div className='col-lg-6'>
            <div className='d-lg-flex align-items-center justify-content-center d-lg-block d-none flex-wrap vh-100 overflow-auto position-relative striped-bg'>
              <ImageWithBasePath
                src='assets/img/aboutus.png'
                alt='About Us'
                className='hover-zoom'
              />
            </div>
          </div>

          {/* Right Column - Dynamic Content */}
          <div className='col-lg-6 col-md-12 col-sm-12'>
            <div className='row justify-content-center align-items-center vh-100 overflow-auto flex-wrap'>
              <div className='about-page'>
                <div className='mx-auto p-4'>
                  <PageRenderer pageSlug='about-us' isEditing={false} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add CSS styles in a style tag */}
      <style>{`
        /* Striped background using CSS - VERTICAL STRIPES */
        .striped-bg {
          background-image: repeating-linear-gradient(
            90deg, /* Changed from 0deg to 90deg for vertical stripes */
            rgba(89, 66, 48, .025),
            rgba(89, 66, 48, .025) 120px,
            #ffffff 120px,
            #ffffff 240px
          );
          background-size: 240px 240px;
          position: relative;
        }

        /* Gradient overlay for better image visibility */
        .striped-bg::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
        }

        /* Responsive styles */
        @media (max-width: 991.98px) {
          .col-lg-6:first-child {
            display: none !important;
          }
        }

        @media (max-width: 768px) {
          .about-page {
            padding: 20px;
          }

          .image-container {
            padding: 20px !important;
          }
          
          .striped-bg {
            background-image: repeating-linear-gradient(
              90deg,
              rgba(89, 66, 48, .025),
              rgba(89, 66, 48, .025) 50px,
              #ffffff 50px,
              #ffffff 100px
            );
            background-size: 100px 100px;
          }
        }

        @media (max-width: 576px) {
          .striped-bg {
            background-image: repeating-linear-gradient(
              90deg,
              rgba(89, 66, 48, .025),
              rgba(89, 66, 48, .025) 40px,
              #ffffff 40px,
              #ffffff 80px
            );
            background-size: 80px 80px;
          }
        }
      `}</style>
    </div>
  );
};

export default AboutUsPage;

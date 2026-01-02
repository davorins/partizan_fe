import React from 'react';
import ImageWithBasePath from '../../core/common/imageWithBasePath';
import PageRenderer from '../../components/page-builder/PageRenderer';

const AboutUsPage = () => {
  return (
    <div className='container-fuild'>
      <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
        <div className='row'>
          {/* Left Column - Fixed Image */}
          <div className='col-lg-6'>
            <div className='d-lg-flex align-items-center justify-content-center bg-light-300 d-lg-block d-none flex-wrap vh-100 overflowy-auto bg-01'>
              <div>
                <ImageWithBasePath
                  src='assets/img/aboutus.png'
                  alt='About Us'
                />
              </div>
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
    </div>
  );
};

export default AboutUsPage;

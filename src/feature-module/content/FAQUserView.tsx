import React, { useEffect, useState, useCallback, useRef } from 'react';
import { faq } from '../../core/common/selectoption/selectoption';
import axios from 'axios';
import { Alert } from 'react-bootstrap';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import './FAQUserView.css';

interface FAQItem {
  _id: string;
  questions: string[];
  answers: string[];
  category: string;
}

const FAQUserView = () => {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const player5Ref = useRef<HTMLImageElement>(null);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/faqs`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = response.data?.data || response.data;

      if (!Array.isArray(data)) {
        throw new Error('Invalid data format received');
      }

      setFaqs(data);
    } catch (err) {
      console.error('Error fetching FAQs:', err);
      setError('Failed to load FAQs. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchFaqs();

    // Preload image
    const img = new Image();
    img.src = '/assets/img/theme/player6_1.png';
    img.onload = () => setImageLoaded(true);
  }, [fetchFaqs]);

  // Parallax effect on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (player5Ref.current) {
        const yOffset = window.scrollY * 0.05;
        player5Ref.current.style.transform = `translateY(${yOffset}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleItem = (id: string) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Reset pagination when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchTerm]);

  const filteredFaqs = faqs.filter((faqItem) => {
    const matchesCategory =
      activeFilter === 'all' || faqItem.category === activeFilter;

    const question = faqItem.questions?.[0] || '';
    const answer = faqItem.answers?.[0] || '';

    const matchesSearch =
      question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      answer.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredFaqs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredFaqs.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Get unique categories from FAQs for filter buttons
  const uniqueCategories = Array.from(
    new Set(
      faqs
        .map((f) => f.category)
        .filter((cat) => cat && cat.toLowerCase() !== 'all'),
    ),
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className='faq-white-container'>
      {/* Background gradient */}
      <div className='faq-bg-gradient-white' />

      {/* Background Image - sits on center-right */}
      <div className={`faq-player-image ${imageLoaded ? 'loaded' : ''}`}>
        <div className='faq-player-image-wrapper'>
          <img
            ref={player5Ref}
            src='/assets/img/theme/player6_1.png'
            alt='Partizan Player'
            className='faq-player-img'
          />
        </div>
      </div>

      {/* FAQ Content - Centered */}
      <div className='faq-content-wrapper-white'>
        <div className='faq-card-white'>
          <div className='faq-header-white'>
            <div className='faq-header-icon-white'>
              <i className='ti ti-question-mark' />
            </div>
            <h1>Frequently Asked Questions</h1>
            <p>
              Find answers to common questions about programs, registration, and
              more
            </p>
          </div>

          {error && (
            <Alert
              variant='danger'
              onClose={() => setError(null)}
              dismissible
              className='faq-alert-white'
            >
              {error}
            </Alert>
          )}

          <div className='faq-controls-white'>
            <div className='search-bar-white'>
              <i className='ti ti-search' />
              <input
                type='text'
                placeholder='Search FAQs...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className='filter-buttons-white'>
              <button
                className={`filter-btn-white ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                All
              </button>
              {uniqueCategories.map((category) => (
                <button
                  key={category}
                  className={`filter-btn-white ${activeFilter === category ? 'active' : ''}`}
                  onClick={() => setActiveFilter(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {filteredFaqs.length === 0 && !loading ? (
            <div className='faq-empty-state-white'>
              <div className='empty-state-icon-white'>
                <i className='ti ti-info-circle' />
              </div>
              <h3>No FAQs Found</h3>
              <p>
                {faqs.length === 0
                  ? 'No FAQs available at the moment'
                  : 'No FAQs match your search criteria'}
              </p>
            </div>
          ) : (
            <>
              <div className='faq-list-white'>
                {currentItems.map((faqItem) => {
                  const categoryLabel = faqItem.category || 'General';
                  const isOpen = openItems.includes(faqItem._id);

                  return (
                    <div key={faqItem._id} className='faq-item-white'>
                      <button
                        className='faq-question-btn-white'
                        onClick={() => toggleItem(faqItem._id)}
                      >
                        <div className='faq-question-content-white'>
                          <span
                            className='category-badge-white'
                            style={{
                              background: getCategoryColor(faqItem.category),
                            }}
                          >
                            {categoryLabel}
                          </span>
                          <span className='question-text-white'>
                            {faqItem.questions?.[0] || 'No question provided'}
                          </span>
                        </div>
                        <i
                          className={`ti ti-chevron-right ${isOpen ? 'open' : ''}`}
                        />
                      </button>
                      <div
                        className={`faq-answer-white ${isOpen ? 'open' : ''}`}
                      >
                        <div className='answer-content-white'>
                          {(faqItem.answers?.[0] || '')
                            .split('\n')
                            .map((para, i) => (
                              <p key={i}>{para}</p>
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className='faq-pagination-white'>
                  <button
                    className='pagination-btn-white'
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <i className='ti ti-chevron-left' />
                    Previous
                  </button>
                  <div className='pagination-numbers-white'>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (number) => (
                        <button
                          key={number}
                          className={`pagination-number-white ${
                            currentPage === number ? 'active' : ''
                          }`}
                          onClick={() => paginate(number)}
                        >
                          {number}
                        </button>
                      ),
                    )}
                  </div>
                  <button
                    className='pagination-btn-white'
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <i className='ti ti-chevron-right' />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    general: '#94a3b8',
    registration: '#594230',
    training: '#10b981',
    games: '#dc2626',
    camps: '#8b5cf6',
    tryouts: '#ea580c',
    events: '#f59e0b',
    'summer camp': '#8b5cf6',
    'training programs': '#10b981',
    'registration & payments': '#594230',
    'facilities & equipment': '#3b82f6',
    'health & safety': '#ef4444',
    'coaching staff': '#06b6d4',
    'tournaments & competitions': '#f59e0b',
    'merchandise & apparel': '#ec4899',
  };
  return colors[category?.toLowerCase()] || '#594230';
};

export default FAQUserView;

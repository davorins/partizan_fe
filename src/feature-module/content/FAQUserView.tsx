import React, { useEffect, useState, useCallback } from 'react';
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
  }, [fetchFaqs]);

  const toggleItem = (id: string) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

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

  if (loading) return <LoadingSpinner />;

  return (
    <div className='faq-white-container'>
      {/* Background gradient - subtle */}
      <div className='faq-bg-gradient-white' />

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
              {faq.map((cat) => (
                <button
                  key={cat.value}
                  className={`filter-btn-white ${activeFilter === cat.value ? 'active' : ''}`}
                  onClick={() => setActiveFilter(cat.value)}
                >
                  {cat.label}
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
            <div className='faq-list-white'>
              {filteredFaqs.map((faqItem) => {
                const categoryLabel =
                  faq.find((c) => c.value === faqItem.category)?.label ||
                  'General';
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
                    <div className={`faq-answer-white ${isOpen ? 'open' : ''}`}>
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
  };
  return colors[category?.toLowerCase()] || '#594230';
};

export default FAQUserView;

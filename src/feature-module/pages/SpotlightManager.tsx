// pages/SpotlightManager.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Space, Spin, Row, Col, Card } from 'antd';
import {
  SaveOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  StarOutlined,
  TeamOutlined,
  UserOutlined,
  FileImageOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { Spotlight, SpotlightForm } from '../../types/types';
import { all_routes } from '../router/all_routes';
import { useAuth } from '../../context/AuthContext';

const blank: SpotlightForm = {
  title: '',
  description: '',
  category: 'Team',
  playerNames: [],
  badges: [],
  images: [],
  files: [],
  date: new Date().toISOString().split('T')[0],
  featured: false,
};

const SpotlightManager = () => {
  const { getAuthToken } = useAuth();
  const [items, setItems] = useState<Spotlight[]>([]);
  const [form, setForm] = useState<SpotlightForm>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    console.log('Spotlight items:', items);
    if (items.length > 0) {
      items.forEach((item, index) => {
        console.log(`Item ${index}:`, item.title);
        console.log(`Images:`, item.images);
        if (item.images && item.images.length > 0) {
          item.images.forEach((img, imgIndex) => {
            console.log(`Image ${imgIndex}:`, img);
            console.log(`Processed URL:`, getImageUrl(img));
          });
        }
      });
    }
  }, [items]);

  // Get auth headers with token
  const getAuthHeaders = async () => {
    const token = await getAuthToken();
    return {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/spotlight`, {
        headers,
      });
      setItems(response.data);
    } catch (err) {
      console.error('Error fetching spotlight items:', err);
      setError('Failed to load spotlight items');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setForm((prev) => ({ ...prev, files: prev.files.concat(files) }));
  };

  const handleRemoveExistingImage = (url: string) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((i) => i !== url),
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('category', form.category);
      fd.append('playerNames', JSON.stringify(form.playerNames));
      fd.append('badges', JSON.stringify(form.badges));
      fd.append('date', form.date);
      fd.append('featured', form.featured.toString());

      // Append files
      form.files.forEach((f) => fd.append('images', f));

      const headers = await getAuthHeaders();

      if (editingId) {
        await axios.put(`${API_BASE_URL}/spotlight/${editingId}`, fd, {
          headers,
        });
      } else {
        await axios.post(`${API_BASE_URL}/spotlight`, fd, { headers });
      }

      setForm(blank);
      setEditingId(null);
      fetchItems();
    } catch (err: any) {
      console.error('Submission error:', err);
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 403) {
        setError(
          'Access denied. You do not have permission to manage spotlight items.'
        );
      } else {
        setError(err.response?.data?.message || 'Error saving spotlight item');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const edit = (item: Spotlight) => {
    setEditingId(item._id);
    setForm({
      title: item.title,
      description: item.description,
      category: item.category,
      playerNames: item.playerNames || [],
      badges: item.badges || [],
      images: item.images || [],
      files: [],
      date: item.date
        ? item.date.split('T')[0]
        : new Date().toISOString().split('T')[0],
      featured: item.featured || false,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this spotlight item?'))
      return;
    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${API_BASE_URL}/spotlight/${id}`, { headers });
      fetchItems();
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 403) {
        setError(
          'Access denied. You do not have permission to delete spotlight items.'
        );
      } else {
        setError(
          err.response?.data?.message || 'Error deleting spotlight item'
        );
      }
    }
  };

  const getImageUrl = (imagePath: string) => {
    console.log('Image path:', imagePath);

    // If it's already a full URL (Cloudinary URL), return as is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }

    // If it's a relative path (fallback), construct URL
    if (imagePath.startsWith('/')) {
      const baseUrl =
        process.env.REACT_APP_API_BASE_URL?.replace('/api', '') ||
        'http://localhost:5001';
      return `${baseUrl}${imagePath}`;
    }

    // Return as is (should be Cloudinary URL)
    return imagePath;
  };

  const clearForm = () => {
    setForm(blank);
    setEditingId(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className='page-wrapper'>
        <div className='content'>
          <div id='global-loader'>
            <div className='page-loader'></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <div className='content'>
        <div className='card'>
          <div className='card-header'>
            <Space>
              <h4 className='mb-0'>
                {editingId
                  ? 'Edit Spotlight Item'
                  : 'Create New Spotlight Item'}
              </h4>
            </Space>
          </div>

          <div className='card-body'>
            {error && (
              <Alert
                message='Error'
                description={error}
                type='error'
                showIcon
                closable
                onClose={() => setError(null)}
                className='mb-3'
              />
            )}

            <form onSubmit={submit}>
              <Row gutter={16}>
                <Col span={12}>
                  <div className='form-group'>
                    <label className='form-label'>Title</label>
                    <input
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                      className='form-control'
                      placeholder='Enter spotlight title'
                      required
                    />
                  </div>
                </Col>

                <Col span={6}>
                  <div className='form-group'>
                    <label className='form-label'>Category</label>
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          category: e.target.value as
                            | 'Team'
                            | 'Player'
                            | 'Other',
                        })
                      }
                      className='form-select'
                    >
                      <option value='Team'>Team</option>
                      <option value='Player'>Player</option>
                      <option value='Other'>Other</option>
                    </select>
                  </div>
                </Col>

                <Col span={6}>
                  <div className='form-group'>
                    <label className='form-label'>Date</label>
                    <input
                      type='date'
                      value={form.date}
                      onChange={(e) =>
                        setForm({ ...form, date: e.target.value })
                      }
                      className='form-control'
                    />
                  </div>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={24}>
                  <div className='form-group'>
                    <label className='form-label'>Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      className='form-control'
                      rows={3}
                      placeholder='Enter spotlight description...'
                    />
                  </div>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <div className='form-group'>
                    <label className='form-label'>
                      Players (comma separated)
                    </label>
                    <input
                      className='form-control'
                      value={form.playerNames.join(', ')}
                      onChange={(e) => {
                        const arr = e.target.value
                          .split(',')
                          .map((x) => x.trim())
                          .filter(Boolean);
                        setForm({ ...form, playerNames: arr });
                      }}
                      placeholder='Enter player names separated by commas'
                    />
                  </div>
                </Col>

                <Col span={12}>
                  <div className='form-group'>
                    <label className='form-label'>
                      Badges (comma separated)
                    </label>
                    <input
                      className='form-control'
                      value={form.badges.join(', ')}
                      onChange={(e) => {
                        const arr = e.target.value
                          .split(',')
                          .map((x) => x.trim())
                          .filter(Boolean);
                        setForm({ ...form, badges: arr });
                      }}
                      placeholder='Enter badges separated by commas'
                    />
                    <small className='form-text text-muted'>
                      Examples: "State Qualifier", "2nd Place", "MVP"
                    </small>
                  </div>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={24}>
                  <div className='form-group'>
                    <div className='d-flex align-items-center mb-2'>
                      <FileImageOutlined className='me-2' />
                      <label className='form-label mb-0'>Images</label>
                    </div>

                    {/* Existing Images */}
                    {form.images.length > 0 && (
                      <div className='mb-3'>
                        <label className='form-label small'>
                          Existing Images
                        </label>
                        <div className='d-flex gap-2 flex-wrap mb-2'>
                          {form.images.map((img, idx) => (
                            <div key={idx} className='position-relative'>
                              <img
                                src={img}
                                className='rounded border'
                                style={{
                                  width: 120,
                                  height: 80,
                                  objectFit: 'cover',
                                }}
                                alt='existing'
                              />
                              <button
                                type='button'
                                className='btn btn-sm btn-danger position-absolute'
                                style={{ right: 5, top: 5 }}
                                onClick={() => handleRemoveExistingImage(img)}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Upload New Images */}
                    <div className='mb-3'>
                      <label className='form-label small'>
                        Upload New Images
                      </label>
                      <input
                        type='file'
                        accept='image/*'
                        multiple
                        onChange={handleFileChange}
                        className='form-control'
                      />
                      {form.files.length > 0 && (
                        <div className='d-flex gap-2 mt-2'>
                          {form.files.map((f, i) => (
                            <div key={i} className='border rounded p-1'>
                              <img
                                src={URL.createObjectURL(f)}
                                alt='preview'
                                style={{
                                  width: 100,
                                  height: 70,
                                  objectFit: 'cover',
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={24}>
                  <div className='form-group'>
                    <div className='form-check'>
                      <input
                        className='form-check-input mb-5'
                        type='checkbox'
                        checked={form.featured}
                        onChange={(e) =>
                          setForm({ ...form, featured: e.target.checked })
                        }
                        id='featuredCheck'
                      />
                      <label
                        className='form-check-label'
                        htmlFor='featuredCheck'
                      >
                        <StarOutlined className='me-1' />
                        Featured (show at top of spotlight page)
                      </label>
                    </div>
                  </div>
                </Col>
              </Row>

              <div className='form-group'>
                <Space>
                  <button
                    type='submit'
                    className='btn btn-primary d-flex align-items-center'
                    disabled={submitting}
                  >
                    <SaveOutlined className='me-2' />
                    {submitting
                      ? 'Saving...'
                      : editingId
                      ? 'Update Spotlight'
                      : 'Create Spotlight'}
                  </button>
                  <button
                    type='button'
                    className='btn btn-secondary d-flex align-items-center'
                    onClick={clearForm}
                  >
                    Clear Form
                  </button>
                </Space>
              </div>
            </form>
          </div>
        </div>

        {/* Spotlight Items List */}
        <div className='card mt-4'>
          <div className='card-header'>
            <h5 className='mb-0'>Spotlight Items ({items.length})</h5>
          </div>
          <div className='card-body'>
            {items.length === 0 ? (
              <div className='text-center py-4'>
                <p className='text-muted'>No spotlight items created yet.</p>
              </div>
            ) : (
              <Row gutter={[16, 16]}>
                {items.map((item) => (
                  <Col key={item._id} xs={24} sm={12} lg={8}>
                    <Card
                      className='h-100'
                      cover={
                        item.images && item.images[0] ? (
                          <img
                            alt={item.title}
                            src={getImageUrl(item.images[0])} // FIX: Call getImageUrl here
                            style={{ height: 200, objectFit: 'cover' }}
                            onError={(e) => {
                              // Fallback if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.src =
                                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y4ZjlmYSIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2Yzc1N2QiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
                            }}
                          />
                        ) : (
                          <div
                            className='d-flex align-items-center justify-content-center bg-light'
                            style={{ height: 200 }}
                          >
                            <FileImageOutlined
                              style={{ fontSize: 48, color: '#ccc' }}
                            />
                          </div>
                        )
                      }
                      actions={[
                        <button
                          type='button'
                          className='btn btn-text'
                          onClick={() => edit(item)}
                        >
                          <EditOutlined /> Edit
                        </button>,
                        <button
                          type='button'
                          className='btn btn-text text-danger'
                          onClick={() => remove(item._id)}
                        >
                          <DeleteOutlined /> Delete
                        </button>,
                      ]}
                    >
                      <Card.Meta
                        title={
                          <div className='d-flex align-items-center'>
                            {item.title}
                            {item.featured && (
                              <StarOutlined className='ms-2 text-warning' />
                            )}
                          </div>
                        }
                        description={
                          <div>
                            <small className='text-muted d-block mb-1'>
                              {new Date(item.date).toLocaleDateString()} •{' '}
                              {item.category}
                            </small>
                            <p className='mb-1 text-truncate'>
                              {item.description}
                            </p>
                            {item.playerNames.length > 0 && (
                              <small className='text-muted'>
                                Players: {item.playerNames.join(', ')}
                              </small>
                            )}
                          </div>
                        }
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpotlightManager;

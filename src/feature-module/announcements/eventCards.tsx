import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from 'react-bootstrap';
import dayjs from 'dayjs';
import { EventDetails } from '../../types/types';
import axios from 'axios';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import './eventCards.css';

const categoryColorMap: Record<string, string> = {
  training: '#594230', // Dark gold/brown instead of blue
  game: '#dc2626',
  holidays: '#10b981',
  celebration: '#f59e0b',
  camp: '#8b5cf6',
  tryout: '#ea580c',
};

const PRIMARY_CATEGORIES = ['camp', 'training', 'tryout', 'game'];
const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

interface EventCardsProps {
  API_BASE_URL?: string;
}

const EventCards: React.FC<EventCardsProps> = ({
  API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '',
}) => {
  const [events, setEvents] = useState<EventDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventDetails | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [currentSeasonStart, setCurrentSeasonStart] = useState<Date | null>(
    null,
  );
  const [seasonWeekOffset, setSeasonWeekOffset] = useState(0);

  const api = useMemo(() => {
    const instance = axios.create({ baseURL: API_BASE_URL });
    instance.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    return instance;
  }, [API_BASE_URL]);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await api.get('/events');
      setEvents(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching events:', error);
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const getCategoryColor = (category?: string): string => {
    if (!category) return '#94a3b8';
    return categoryColorMap[category.toLowerCase()] || '#94a3b8';
  };

  const getFirstUpcomingSeasonStart = useCallback(
    (primaryEventsList: EventDetails[]) => {
      if (primaryEventsList.length === 0) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const firstUpcomingEvent = primaryEventsList.find((event) => {
        const eventDate = new Date(event.start);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
      });

      if (firstUpcomingEvent) {
        return new Date(firstUpcomingEvent.start);
      }

      return new Date(primaryEventsList[primaryEventsList.length - 1].start);
    },
    [],
  );

  const getMondayOfDate = useCallback((date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const calculateSeasonWeekOffset = useCallback((seasonStartMonday: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (today < seasonStartMonday) {
      return 0;
    }

    const diffTime = today.getTime() - seasonStartMonday.getTime();
    const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));

    return diffWeeks;
  }, []);

  const getCurrentWeekMonday = useCallback(
    (seasonStartMonday: Date, offset: number) => {
      const targetMonday = new Date(seasonStartMonday);
      targetMonday.setDate(seasonStartMonday.getDate() + offset * 7);
      targetMonday.setHours(0, 0, 0, 0);
      return targetMonday;
    },
    [],
  );

  const allEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
  }, [events]);

  const calendarFilteredEvents = useMemo(() => {
    if (selectedCategory === 'all') {
      return allEvents;
    }
    return allEvents.filter(
      (event) =>
        event.category?.toLowerCase() === selectedCategory.toLowerCase(),
    );
  }, [allEvents, selectedCategory]);

  const primaryEvents = useMemo(() => {
    return allEvents.filter((event) =>
      PRIMARY_CATEGORIES.includes(event.category?.toLowerCase() || ''),
    );
  }, [allEvents]);

  useEffect(() => {
    if (primaryEvents.length > 0) {
      const firstUpcomingEventDate = getFirstUpcomingSeasonStart(primaryEvents);
      if (firstUpcomingEventDate) {
        const seasonStartMonday = getMondayOfDate(firstUpcomingEventDate);
        setCurrentSeasonStart(seasonStartMonday);

        const calculatedOffset = calculateSeasonWeekOffset(seasonStartMonday);
        setSeasonWeekOffset(calculatedOffset);
        setWeekOffset(calculatedOffset);
      }
    }
  }, [
    primaryEvents,
    getFirstUpcomingSeasonStart,
    getMondayOfDate,
    calculateSeasonWeekOffset,
  ]);

  const goToPreviousWeek = () => {
    setWeekOffset((prev) => prev - 1);
  };

  const goToNextWeek = () => {
    setWeekOffset((prev) => prev + 1);
  };

  const goToCurrentSeasonWeek = () => {
    if (currentSeasonStart) {
      const calculatedOffset = calculateSeasonWeekOffset(currentSeasonStart);
      setSeasonWeekOffset(calculatedOffset);
      setWeekOffset(calculatedOffset);
    }
  };

  const getCurrentWeekStart = useCallback(() => {
    if (!currentSeasonStart) {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(today);
      monday.setDate(today.getDate() - daysFromMonday);
      monday.setHours(0, 0, 0, 0);
      return monday;
    }

    return getCurrentWeekMonday(currentSeasonStart, weekOffset);
  }, [currentSeasonStart, weekOffset, getCurrentWeekMonday]);

  const currentWeekStart = getCurrentWeekStart();
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
  currentWeekEnd.setHours(23, 59, 59, 999);

  const eventsForCurrentWeek = useMemo(() => {
    return primaryEvents.filter((event) => {
      const eventDate = new Date(event.start);
      return eventDate >= currentWeekStart && eventDate <= currentWeekEnd;
    });
  }, [primaryEvents, currentWeekStart, currentWeekEnd]);

  const eventsByDay = useMemo(() => {
    const days: Record<string, EventDetails[]> = {};
    DAYS_OF_WEEK.forEach((day) => {
      days[day] = [];
    });

    eventsForCurrentWeek.forEach((event) => {
      const dayName = dayjs(event.start).format('dddd');
      if (days[dayName]) {
        days[dayName].push(event);
      }
    });

    Object.keys(days).forEach((day) => {
      days[day].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      );
    });

    return days;
  }, [eventsForCurrentWeek]);

  const totalEventsInWeek = eventsForCurrentWeek.length;
  const isCurrentWeek = weekOffset === seasonWeekOffset;

  const calendarEvents = useMemo(() => {
    return calendarFilteredEvents.map((event) => ({
      id: event._id,
      title: event.title,
      start: event.start,
      end: event.end,
      backgroundColor: getCategoryColor(event.category),
      borderColor: getCategoryColor(event.category),
      textColor: '#fff',
    }));
  }, [calendarFilteredEvents]);

  const formatTime = (dateString: string) => dayjs(dateString).format('h:mm A');
  const handleEventClick = (event: EventDetails) => {
    setSelectedEvent(event);
    setShowEventDetailsModal(true);
  };
  const handleCalendarEventClick = (clickInfo: any) => {
    const event = events.find((e) => e._id === clickInfo.event.id);
    if (event) handleEventClick(event);
  };
  const handleCloseModal = () => {
    setShowEventDetailsModal(false);
    setSelectedEvent(null);
  };

  if (isLoading) {
    return (
      <div className='events-white-container'>
        <div className='events-white-card'>
          <div className='spinner-wrapper'>
            <div className='spinner' />
            <p>Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='events-white-container'>
      <div className='events-white-card'>
        <div className='events-header'>
          <div className='events-header-icon'>
            <i className='ti ti-calendar-stats' />
          </div>
          <h1>Events & Schedule</h1>
          <p>
            Stay updated with all upcoming games, training sessions, and special
            events
          </p>
        </div>

        <div className='events-filters'>
          <div className='dropdown-wrapper'>
            <button
              className='category-dropdown-btn'
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <i className='ti ti-category' />
              {selectedCategory === 'all'
                ? 'All Categories'
                : selectedCategory.charAt(0).toUpperCase() +
                  selectedCategory.slice(1)}
              <i
                className={`ti ti-chevron-down ${dropdownOpen ? 'rotate' : ''}`}
              />
            </button>
            {dropdownOpen && (
              <div className='category-dropdown-menu'>
                <button
                  className='dropdown-item'
                  onClick={() => {
                    setSelectedCategory('all');
                    setDropdownOpen(false);
                  }}
                >
                  <span
                    className='category-dot'
                    style={{ background: '#94a3b8' }}
                  />
                  All Categories
                </button>
                {Object.keys(categoryColorMap).map((category) => (
                  <button
                    key={category}
                    className='dropdown-item'
                    onClick={() => {
                      setSelectedCategory(category);
                      setDropdownOpen(false);
                    }}
                  >
                    <span
                      className='category-dot'
                      style={{ background: getCategoryColor(category) }}
                    />
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className='two-column-layout'>
          {/* LEFT COLUMN - Season-Aware Weekly Schedule */}
          <div className='primary-events-column'>
            <div className='column-header'>
              <h3>Season Schedule</h3>
            </div>

            {/* Week Navigation */}
            <div className='week-navigation'>
              <button className='week-nav-btn' onClick={goToPreviousWeek}>
                <i className='ti ti-chevron-left' /> Prev
              </button>
              <div className='week-date-range'>
                <i className='ti ti-calendar-week' />
                <span>
                  {dayjs(currentWeekStart).format('MMM D')} -{' '}
                  {dayjs(currentWeekEnd).format('MMM D, YYYY')}
                </span>
              </div>
              <button className='week-nav-btn' onClick={goToNextWeek}>
                Next <i className='ti ti-chevron-right' />
              </button>
            </div>

            {totalEventsInWeek === 0 ? (
              <div className='empty-state-small'>
                <i className='ti ti-calendar-off' />
                <p>No events scheduled for this week</p>
                {!isCurrentWeek && (
                  <button
                    className='current-week-btn'
                    onClick={goToCurrentSeasonWeek}
                  >
                    <i className='ti ti-calendar' /> Current Week
                  </button>
                )}
              </div>
            ) : (
              <div className='days-list'>
                {DAYS_OF_WEEK.map((day) => {
                  const dayEvents = eventsByDay[day];
                  const hasEvents = dayEvents.length > 0;
                  return (
                    <div
                      key={day}
                      className={`day-group ${!hasEvents ? 'no-events' : ''}`}
                    >
                      <div className='day-header'>
                        <div className='day-name'>{day.slice(0, 3)}</div>
                        <div className='day-date'>
                          {hasEvents
                            ? dayjs(dayEvents[0].start).format('MMM D')
                            : ''}
                        </div>
                      </div>
                      {hasEvents ? (
                        <div className='day-events'>
                          {dayEvents.map((event, idx) => {
                            const categoryColor = getCategoryColor(
                              event.category,
                            );
                            return (
                              <div
                                key={idx}
                                className='event-card'
                                onClick={() => handleEventClick(event)}
                              >
                                <div className='event-time-badge'>
                                  {formatTime(event.start)}
                                </div>
                                <div className='event-card-content'>
                                  <div
                                    className='event-category'
                                    style={{ color: categoryColor }}
                                  >
                                    <i className='ti ti-circle-filled' />
                                    {event.category?.toUpperCase() || 'EVENT'}
                                  </div>
                                  <h4 className='event-title'>{event.title}</h4>
                                  {event.school && (
                                    <div className='event-location'>
                                      <i className='ti ti-map-pin' />
                                      {event.school.name}
                                    </div>
                                  )}
                                </div>
                                <div className='event-arrow'>
                                  <i className='ti ti-chevron-right' />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className='no-events-message'>
                          <i className='ti ti-calendar' />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Mini Calendar */}
          <div className='secondary-events-column'>
            <div className='column-header secondary'>
              <h3>Calendar View</h3>
              {selectedCategory !== 'all' && (
                <div className='active-filter-badge'>
                  <i className='ti ti-filter' /> {selectedCategory}
                </div>
              )}
            </div>
            <div className='mini-calendar-wrapper'>
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView='dayGridMonth'
                events={calendarEvents}
                headerToolbar={{
                  left: 'prev',
                  center: 'title',
                  right: 'next',
                }}
                height='auto'
                contentHeight='auto'
                eventDisplay='block'
                dayMaxEvents={2}
                fixedWeekCount={false}
                showNonCurrentDates={false}
                eventClick={handleCalendarEventClick}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Event Details Modal */}
      <Modal
        show={showEventDetailsModal}
        onHide={handleCloseModal}
        centered
        className='event-modal-white'
      >
        <div className='modal-white'>
          <Modal.Header closeButton>
            <div className='modal-header-content'>
              <span
                className='modal-category-badge'
                style={{
                  background: getCategoryColor(selectedEvent?.category),
                }}
              >
                {selectedEvent?.category?.toUpperCase() || 'EVENT'}
              </span>
            </div>
          </Modal.Header>
          <Modal.Body>
            {selectedEvent && (
              <>
                <div className='modal-event-header'>
                  <div className='modal-event-icon'>
                    <i className='ti ti-calendar-event' />
                  </div>
                  <div>
                    <h2>{selectedEvent.title}</h2>
                    {selectedEvent.caption && (
                      <p className='modal-event-caption'>
                        {selectedEvent.caption}
                      </p>
                    )}
                  </div>
                </div>
                <div className='modal-event-details'>
                  <div className='detail-item'>
                    <i className='ti ti-calendar' />
                    <div>
                      <label>Date</label>
                      <p>
                        {dayjs(selectedEvent.start).format('MMMM D, YYYY')}
                        {selectedEvent.end &&
                          !dayjs(selectedEvent.start).isSame(
                            dayjs(selectedEvent.end),
                            'day',
                          ) &&
                          ` - ${dayjs(selectedEvent.end).format('MMMM D, YYYY')}`}
                      </p>
                    </div>
                  </div>
                  <div className='detail-item'>
                    <i className='ti ti-clock' />
                    <div>
                      <label>Time</label>
                      <p>
                        {dayjs(selectedEvent.start).format('h:mm A')} -{' '}
                        {dayjs(selectedEvent.end || selectedEvent.start).format(
                          'h:mm A',
                        )}
                      </p>
                    </div>
                  </div>
                  {selectedEvent?.price !== undefined &&
                    selectedEvent.price > 0 && (
                      <div className='detail-item'>
                        <i className='ti ti-currency-dollar' />
                        <div>
                          <label>Price</label>
                          <p>
                            ${selectedEvent.price.toFixed(2)}{' '}
                            <span>per person</span>
                          </p>
                        </div>
                      </div>
                    )}
                </div>
                {selectedEvent.school && (
                  <div className='modal-location'>
                    <h4>
                      <i className='ti ti-map-pin' /> Location
                    </h4>
                    <div className='location-card'>
                      <p>
                        <strong>{selectedEvent.school.name}</strong>
                      </p>
                      <p>{selectedEvent.school.address}</p>
                      {selectedEvent.school.website && (
                        <a
                          href={selectedEvent.school.website}
                          target='_blank'
                          rel='noreferrer'
                        >
                          {selectedEvent.school.website}
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {selectedEvent.description && (
                  <div className='modal-description'>
                    <h4>
                      <i className='ti ti-notes' /> Description
                    </h4>
                    <div className='description-card'>
                      <p>{selectedEvent.description}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <button className='modal-close-btn' onClick={handleCloseModal}>
              Close
            </button>
          </Modal.Footer>
        </div>
      </Modal>
    </div>
  );
};

export default EventCards;

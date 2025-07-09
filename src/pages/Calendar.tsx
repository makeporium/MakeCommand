
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_type: 'birthday' | 'meeting' | 'reminder' | 'personal' | 'work';
  event_date: string;
  event_time?: string;
  all_day: boolean;
  created_at: string;
}

export const Calendar = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<'birthday' | 'meeting' | 'reminder' | 'personal' | 'work'>('personal');
  const [eventTime, setEventTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('event_date', { ascending: true });

    if (error) {
      toast.error('Failed to fetch events');
    } else {
      setEvents(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const eventData = {
      title,
      description: description || null,
      event_type: eventType,
      event_date: selectedDate.toISOString().split('T')[0],
      event_time: allDay ? null : eventTime || null,
      all_day: allDay,
      user_id: user.id,
    };

    let error;
    if (editingEvent) {
      ({ error } = await supabase
        .from('calendar_events')
        .update(eventData)
        .eq('id', editingEvent.id));
    } else {
      ({ error } = await supabase
        .from('calendar_events')
        .insert([eventData]));
    }

    if (error) {
      toast.error('Failed to save event');
    } else {
      toast.success(editingEvent ? 'Event updated!' : 'Event created!');
      resetForm();
      fetchEvents();
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEventType('personal');
    setEventTime('');
    setAllDay(false);
    setShowForm(false);
    setEditingEvent(null);
  };

  const handleEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description || '');
    setEventType(event.event_type);
    setEventTime(event.event_time || '');
    setAllDay(event.all_day);
    setSelectedDate(new Date(event.event_date));
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete event');
    } else {
      toast.success('Event deleted');
      fetchEvents();
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'birthday': return 'bg-pink-900/30 text-pink-400 border-pink-500/30';
      case 'meeting': return 'bg-blue-900/30 text-blue-400 border-blue-500/30';
      case 'reminder': return 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30';
      case 'work': return 'bg-red-900/30 text-red-400 border-red-500/30';
      case 'personal': return 'bg-green-900/30 text-green-400 border-green-500/30';
      default: return 'bg-gray-700/30 text-gray-400 border-gray-500/30';
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.event_date === dateStr);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Neural Calendar</h1>
          <p className="text-gray-400">Track your temporal coordinates</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
        >
          <Plus size={20} className="mr-2" />
          New Event
        </Button>
      </div>

      {showForm && (
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">
            {editingEvent ? 'Edit Event' : 'New Event'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Event title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-gray-700/50 border-gray-600 text-white"
              required
            />
            <Textarea
              placeholder="Event description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-gray-700/50 border-gray-600 text-white"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={eventType} onValueChange={(value: any) => setEventType(value)}>
                <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="bg-gray-700/50 border-gray-600 text-white"
                required
              />
              <Input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="bg-gray-700/50 border-gray-600 text-white"
                disabled={allDay}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allDay"
                checked={allDay}
                onChange={(e) => {
                  setAllDay(e.target.checked);
                  if (e.target.checked) setEventTime('');
                }}
                className="rounded bg-gray-700/50 border-gray-600"
              />
              <label htmlFor="allDay" className="text-gray-300">All Day Event</label>
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">
                {editingEvent ? 'Update' : 'Create'} Event
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-4">
              {weekDays.map(day => (
                <div key={day} className="text-center text-gray-400 font-medium py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(currentMonth).map((date, index) => {
                const dayEvents = getEventsForDate(date);
                const isToday = date && date.toDateString() === new Date().toDateString();
                
                return (
                  <div
                    key={index}
                    className={`min-h-24 p-2 border border-gray-700/30 rounded-lg ${
                      date ? 'bg-gray-700/20 hover:bg-gray-700/40 cursor-pointer' : ''
                    } ${isToday ? 'border-cyan-500/50 bg-cyan-900/20' : ''}`}
                    onClick={() => date && setSelectedDate(date)}
                  >
                    {date && (
                      <>
                        <div className="text-white font-medium mb-1">{date.getDate()}</div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 2).map(event => (
                            <div
                              key={event.id}
                              className={`text-xs px-1 py-0.5 rounded ${getEventTypeColor(event.event_type)} truncate`}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-xs text-gray-400">+{dayEvents.length - 2} more</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
            <h3 className="text-lg font-bold text-cyan-400 mb-4">
              Events for {selectedDate.toLocaleDateString()}
            </h3>
            <div className="space-y-3">
              {getEventsForDate(selectedDate).map(event => (
                <div
                  key={event.id}
                  className={`p-3 rounded-lg border ${getEventTypeColor(event.event_type)}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold">{event.title}</h4>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(event)}
                        className="text-cyan-400 hover:text-cyan-300 p-1"
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  {event.description && (
                    <p className="text-sm opacity-80 mb-2">{event.description}</p>
                  )}
                  <div className="flex items-center gap-1 text-xs opacity-70">
                    <Clock size={10} />
                    {event.all_day ? 'All Day' : event.event_time || 'No time set'}
                  </div>
                </div>
              ))}
              {getEventsForDate(selectedDate).length === 0 && (
                <p className="text-gray-400 text-center py-4">No events for this date</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

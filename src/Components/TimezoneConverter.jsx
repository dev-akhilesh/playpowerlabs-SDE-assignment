import React, { useState, useEffect } from 'react'; 
import moment from 'moment-timezone'; // For handling time zones
import Slider from 'react-slider'; // Slider component
import Select from 'react-select'; // Dropdown select component
import DatePicker from 'react-datepicker'; // Date picker component
import { FaCalendarAlt, FaCalendarMinus, FaLink } from "react-icons/fa"; 
import { RiDraggable } from "react-icons/ri"; 
import { BiSortAlt2 } from "react-icons/bi"; 
import { MdDarkMode, MdLightMode } from "react-icons/md";
import 'react-datepicker/dist/react-datepicker.css'; // Styles for DatePicker
import { DndContext, closestCorners } from '@dnd-kit/core'; // Drag and drop context and collision detection
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'; // Sortable list and utilities
import { CSS } from '@dnd-kit/utilities'; // CSS utilities
import "../styles/TimezoneConverter.css";
 

// Generate initial times for time zones
const generateInitialTimes = () => ({
    'Asia/Kolkata': moment().tz('Asia/Kolkata').format('HH:mm'),
    UTC: moment().tz('UTC').format('HH:mm'),
});

// Generate initial time zone mappings
const generateInitialTimezones = () => ({
    'Asia/Kolkata': 'Asia/Kolkata',
    'UTC': 'UTC',
});

// Generate slider marks at intervals for the time slider
const generateSliderMarks = () => {
    const marks = [];
    const numMarks = 25; // Number of marks on the slider
    const markSpacing = 1440 / (numMarks - 1); // Total minutes in a day divided by number of marks

    for (let i = 0; i < numMarks; i++) {
        const markPosition = i * markSpacing;
        marks.push(markPosition);
    }

    return marks;
};

// Get abbreviation for a time zone
const getTimezoneAbbr = (zone) => {
    return moment.tz(zone).format('z');
};

// Get the offset for a time zone
const getTimezoneOffset = (zone) => {
    const offset = moment.tz(zone).format('Z');
    return `GMT ${offset}`;
};

// Generate time options for the time select dropdown
const generateTimeOptions = () => {
    const options = [];
    for (let i = 0; i < 96; i++) { // 96 intervals in a day (15 minutes each)
        const hour = Math.floor(i / 4);
        const minute = (i % 4) * 15;
        const time = moment().startOf('day').add(hour, 'hours').add(minute, 'minutes').format('h:mm A');
        options.push({ value: `${hour}:${minute < 10 ? '0' : ''}${minute}`, label: time });
    }
    return options;
};

// Main component for timezone conversion
const TimezoneConverter = () => {
    const [selectedTimes, setSelectedTimes] = useState(generateInitialTimes()); // Selected times in various time zones
    const [selectedDate, setSelectedDate] = useState(new Date()); // Selected date
    const [reverseOrder, setReverseOrder] = useState(false); // Flag for reversing the order of time zones
    const [timezones, setTimezones] = useState(generateInitialTimezones()); // Time zone mappings
    const [isDark, setIsDark] = useState(() => JSON.parse(localStorage.getItem('isDark')) || false); // Dark mode state
    const [isSharing, setIsSharing] = useState(false); // Flag for showing sharing options

    // State for link options
    const [includeTime, setIncludeTime] = useState(false);
    const [includeDate, setIncludeDate] = useState(false);
    const [linkTime, setLinkTime] = useState("");
    const [linkDate, setLinkDate] = useState("");


    // Save dark mode preference in localStorage
    useEffect(() => {
        localStorage.setItem('isDark', JSON.stringify(isDark));
    }, [isDark]);

    // Handle date changes from DatePicker
    const handleDateChange = (date) => {
        setSelectedDate(date);
    };

    // Handle time changes for a specific time zone
    const handleTimeChange = (zone, value) => {
        const updatedDateTime = moment(selectedDate).startOf('day').add(value, 'minutes').format('YYYY-MM-DD HH:mm');
        const updatedTimes = { ...selectedTimes, [zone]: moment(updatedDateTime).format('HH:mm') };

        // Update times for other time zones based on the changed time zone
        Object.keys(timezones).forEach(tz => {
            if (tz !== zone) {
                updatedTimes[tz] = moment.tz(updatedDateTime, timezones[zone]).tz(timezones[tz]).format('HH:mm');
            }
        });

        setSelectedTimes(updatedTimes);
    };

    // Add a new time zone to the list
    const addNewTimezone = (option) => {
        const label = option.value;
        const zone = label.replace(/\//g, '-'); // Convert to a valid key format
        setTimezones({ ...timezones, [zone]: label });
        setSelectedTimes({ ...selectedTimes, [zone]: moment().tz(label).format('HH:mm') });
    };

    // Remove a time zone from the list
    const removeTimezone = (zone) => {
        const newTimezones = { ...timezones };
        delete newTimezones[zone];
        const newSelectedTimes = { ...selectedTimes };
        delete newSelectedTimes[zone];
        setSelectedTimes(newSelectedTimes);
        setTimezones(newTimezones);
    };

    const allTimezones = moment.tz.names().map(tz => ({ value: tz, label: tz })); // List of all time zones for dropdown

    const timeOptions = generateTimeOptions(); // Time options for select dropdown

    // Toggle the order of time zones (reverse)
    const reverseTimezones = () => {
        setReverseOrder(!reverseOrder);
    };

    // Handle drag and drop reordering
    const onDragEnd = ({ active, over }) => {
        if (active.id !== over.id) {
            const oldIndex = timezoneEntries.findIndex(([zone]) => zone === active.id);
            const newIndex = timezoneEntries.findIndex(([zone]) => zone === over.id);

            const reorderedEntries = arrayMove(timezoneEntries, oldIndex, newIndex);
            setSelectedTimes(Object.fromEntries(reorderedEntries));
        }
    };

    let timezoneEntries = Object.entries(selectedTimes); // Convert selected times to array of entries

    if (reverseOrder) {
        timezoneEntries = timezoneEntries.reverse(); // Reverse the order if needed
    }

    // Container component for each time zone
    const Container = ({ zone, time }) => {
        const [localTime, setLocalTime] = useState(moment.duration(time, 'HH:mm').asMinutes());

        // Use useSortable hook to enable drag and drop
        const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: zone });
        const style = { transform: CSS.Transform.toString(transform), transition };

        const handleSliderChange = (value) => {
            setLocalTime(value);
        };

        const handleSliderChangeComplete = (value) => {
            handleTimeChange(zone, value);
        };

        const handleTimeSelectChange = (selectedOption) => {
            setLocalTime(moment.duration(selectedOption.value).asMinutes());
            handleTimeChange(zone, moment.duration(selectedOption.value).asMinutes());
        };

        useEffect(() => {
            setLocalTime(moment.duration(time, 'HH:mm').asMinutes());
        }, [time]);

        // Format the display time for the selected time zone
        const formatDisplayTime = (zone, minutes) => {
            const updatedDateTime = moment(selectedDate).startOf('day').add(minutes, 'minutes').format('YYYY-MM-DD HH:mm');
            return moment.tz(updatedDateTime, timezones[zone]).format('h:mm A');
        };

        // Format the display date for the selected time zone
        const formatDisplayDate = (zone, minutes) => {
            const updatedDateTime = moment(selectedDate).startOf('day').add(minutes, 'minutes').format('YYYY-MM-DD HH:mm');
            return moment.tz(updatedDateTime, timezones[zone]).format('ddd D, MMMM');
        };

        const labels = ["12AM", "3AM", "6AM", "9AM", "12PM", "3PM", "6PM", "9PM"]; // Slider labels

        return (
            <div className={'zone-container'} id={isDark && 'dark-zone-container'} ref={setNodeRef} style={style} >
                <div className='zone-upper-row'>
                    <div className='drag-button' {...listeners} {...attributes}><RiDraggable /><RiDraggable /><RiDraggable /><RiDraggable /></div>
                    <div className='zone-left-box'>
                        <h1 style={isDark ? { color: 'white' } : {}}>{getTimezoneAbbr(timezones[zone])}</h1>
                        <p>{zone.replace(/-/g, '/')}</p>
                    </div>
                    <div className='zone-right-box'>
                        <Select
                            className={"time-picker"}
                            classNamePrefix="select"
                            placeholder={formatDisplayTime(zone, localTime)}
                            value={timeOptions.find(option => moment.duration(option.value).asMinutes() === localTime)}
                            options={timeOptions}
                            onChange={handleTimeSelectChange}
                            styles={{
                                indicatorsContainer: () => ({ display: 'none' }),
                                container: (prev) => ({ ...prev, width: '15vw', height: '8vh' }),
                                placeholder: (prev) => ({ ...prev, fontSize: '1.5rem', fontWeight: 'bold', color: isDark ? 'white' : 'black', }),
                                valueContainer: (prev) => ({
                                    ...prev,
                                    fontSize: '1.5rem',
                                    fontWeight: 'bold',
                                    borderRadius: '0.5vh',
                                    color: isDark ? 'white' : 'black',
                                    backgroundColor: isDark ? '#2c2f34ef' : 'white',
                                })
                            }}
                        />
                        <span>
                            <span>{getTimezoneOffset(zone)}</span>
                            <span>{formatDisplayDate(zone, localTime)}</span>
                        </span>
                    </div>
                    <button className='remove' onClick={() => removeTimezone(zone)}>x</button>
                </div>
                <Slider
                    className="time-slider"
                    thumbClassName="time-thumb"
                    trackClassName={isDark ? 'time-track dark-time-track' : 'time-track'}
                    markClassName="time-mark"
                    marks={generateSliderMarks()}
                    min={0}
                    max={1440}
                    step={15}
                    value={localTime}
                    onChange={handleSliderChange}
                    onAfterChange={handleSliderChangeComplete}
                    renderThumb={(props, state) => <div {...props}>||</div>}
                    renderMark={(props) => <span {...props} />}
                />
                {labels && (
                    <div className="labels">
                        {generateSliderMarks()
                            .filter((mark, index) => mark % 180 === 0)
                            .map((mark, index) => (
                                <div key={mark}>{labels[index]}</div>
                            ))}
                    </div>
                )}
            </div>
        );
    };

    const handleMeetClick = () => {
        window.open("https://calendar.google.com/calendar/u/0/r/eventedit", "_blank", "noopener,noreferrer");
    };

    const handleIncludeTimeChange = (e) => {
        setIncludeTime(e.target.checked);
    };

    const handleIncludeDateChange = (e) => {
        setIncludeDate(e.target.checked);
    };

    return (
        <div className="main-container" id={isDark && 'dark-main-container'}>
            <h1 style={{ margin: '3vh 0', color: 'gray' }}>Time Converter</h1>
            <div className='upper-row' id={isDark && 'dark-upper-row'}>
                <Select
                    className="basic-single"
                    classNamePrefix="select"
                    placeholder={"Add Time Zone, City or Town"}
                    isSearchable={true}
                    name="timezone"
                    options={allTimezones}
                    onChange={addNewTimezone}
                    styles={{
                        container: (base) => ({
                            ...base,
                            width: "30vw",
                            margin: '0 auto',
                        }),
                        control: (base, state) => ({
                            ...base,
                            height: '6vh',
                            borderRadius: '0.5vh',
                            borderColor: state.isFocused ? (isDark ? '#8e44ad' : '#3498db') : base.borderColor,
                            boxShadow: state.isFocused ? `0 0 0 1px ${isDark ? '#8e44ad' : '#3498db'}` : base.boxShadow,
                            '&:hover': {
                                borderColor: state.isFocused ? (isDark ? '#8e44ad' : '#3498db') : base.borderColor,
                            },
                            backgroundColor: isDark ? '#2c2f34ef' : 'white',
                        }),
                        valueContainer: (base) => ({
                            ...base,
                            padding: '0 8px',
                            color: isDark ? 'white' : 'black',
                        }),
                        placeholder: (base) => ({
                            ...base,
                            color: isDark ? 'white' : 'black',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                        }),
                        singleValue: (base) => ({
                            ...base,
                            color: isDark ? 'white' : 'black',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                        }),
                        indicatorsContainer: (base) => ({
                            ...base,
                            backgroundColor: isDark ? '#2c2f34ef' : 'white',
                        }),
                        dropdownIndicator: (base) => ({
                            ...base,
                            color: isDark ? 'white' : 'black',
                            '&:hover': {
                                color: isDark ? '#8e44ad' : '#3498db',
                            },
                        }),
                        menu: (base) => ({
                            ...base,
                            backgroundColor: isDark ? '#2c2f34ef' : 'white',
                            color: isDark ? 'white' : 'black',
                            borderRadius: '0.5vh',
                        }),
                        menuList: (base) => ({
                            ...base,
                            padding: 0,
                        }),
                        option: (base, state) => ({
                            ...base,
                            backgroundColor: state.isFocused ? (isDark ? '#8e44ad' : '#3498db') : base.backgroundColor,
                            color: isDark ? 'white' : 'black',
                            '&:hover': {
                                backgroundColor: isDark ? '#8e44ad' : '#3498db',
                                color: 'white',
                            },
                        }),
                    }}
                />

                <div className='date-container'>
                    <DatePicker
                        className={isDark ? 'date-picker dark-date-picker' : 'date-picker'}
                        id='date-picker'
                        selected={selectedDate}
                        onChange={handleDateChange}
                        dateFormat="MMMM d, yyyy"
                    />
                    <label className='calendar-box' htmlFor="date-picker"
                        style={isDark ? { backgroundColor: '#2c2f34ef', borderRadius: '0 1vh 1vh 0' } : {}}>
                        <FaCalendarAlt />
                    </label>
                </div>

                <div className='filter-container'>
                    <div onClick={handleMeetClick}>
                        <FaCalendarMinus />
                    </div>
                    <div onClick={reverseTimezones}><BiSortAlt2 /></div>
                    <div onClick={() => setIsSharing(!isSharing)}><FaLink /></div>
                    <div onClick={() => setIsDark(prev => !prev)}>{isDark ? <MdLightMode /> : <MdDarkMode />}</div>
                </div>
            </div>

            {isSharing &&
                <div className={`link-row ${isDark ? 'dark-link-row' : ''}`}>
                    <input className='link-input' type="text" value={`https://time-converter/?time=${includeTime ? linkTime : ''}&date=${includeDate ? linkDate : ''}`} readOnly />
                    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                        <div className='input-group'>
                            <input type="checkbox" name="time" id="time" checked={includeTime} onChange={handleIncludeTimeChange} />
                            <label htmlFor='time'>Include Time</label>
                            {includeTime && <input type="time" name="time-value" id="time-value" value={linkTime} onChange={e => setLinkTime(e.target.value)} />}
                        </div>
                        <div className='input-group'>
                            <input type="checkbox" name="date" id="date" checked={includeDate} onChange={handleIncludeDateChange} />
                            <label htmlFor='date'>Include Date</label>
                            {includeDate && <input type="date" name="date-value" id="date-value" value={linkDate} onChange={e => setLinkDate(e.target.value)} />}
                        </div>
                    </div>
                </div>
            }


            <DndContext collisionDetection={closestCorners} onDragEnd={onDragEnd}>
                <div className='time-converter'>
                    <SortableContext items={timezoneEntries.map(([zone]) => zone)} strategy={verticalListSortingStrategy}>
                        {timezoneEntries.map(([zone, time]) => (
                            <Container key={zone} zone={zone} time={time} />
                        ))}
                    </SortableContext>
                </div>
            </DndContext >
        </div>
    );
};

export default TimezoneConverter;




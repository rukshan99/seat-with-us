/**
 * The two events. Shared by the HTML template (build time) and the app (run time).
 * Wording mirrors the printed invitations.
 */
export const SITE_URL = 'https://rukshan99.github.io/seat-with-us/';

export const EVENTS = {
  wedding: {
    key: 'wedding',
    label: 'Wedding',
    eyebrow: 'The wedding of',
    names: ['Ashinsana', 'Pasindu'],
    date: '2026-12-10',
    dateLabel: 'Thursday, 10 December',
    venue: 'Suriya Resort, Waikkal',
    time: 'Reception from 11.00 am',
    themeColor: '#EEE7DA',
    photos: {
      preview: 'SPP07037', // link preview when the URL is shared
      backdrop: 'SPP07341', // left half of the screen on desktop
      backdropFocus: '52% 70%',
      keepsake: 'SPP07061', // the print under the result card
      alt: 'Ashinsana and Pasindu dancing on the beach at dusk',
      keepsakeAlt: 'Ashinsana and Pasindu embracing by the sea',
    },
    title: 'Find your table · Ashinsana & Pasindu',
    description:
      'Type your name to find your table at Ashinsana & Pasindu’s wedding reception, Suriya Resort, Waikkal.',
  },
  homecoming: {
    key: 'homecoming',
    label: 'Homecoming',
    eyebrow: 'The homecoming of',
    names: ['Pasindu', 'Ashinsana'],
    date: '2026-12-13',
    dateLabel: 'Sunday, 13 December',
    venue: 'Eagles’ Lagoon, Kurana',
    time: '6.30 pm to 11.00 pm',
    themeColor: '#3A0709',
    photos: {
      preview: 'SPP07416',
      backdrop: 'SPP07547',
      backdropFocus: '42% 72%',
      keepsake: 'SPP07416',
      alt: 'Pasindu and Ashinsana walking hand in hand along the shore at dusk',
      keepsakeAlt: 'Pasindu and Ashinsana laughing together on the beach',
    },
    title: 'Find your table · Pasindu & Ashinsana’s homecoming',
    description:
      'Type your name to find your table at Pasindu & Ashinsana’s homecoming, Eagles’ Lagoon, Kurana.',
  },
};

/** From this date (Sri Lanka time) the bare URL opens the homecoming instead. */
export const SWITCH_TO_HOMECOMING_ON = '2026-12-12';

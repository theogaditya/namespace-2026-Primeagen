'use client';

import { useEffect } from 'react';
import ScrollExpandMedia from '@/components/blocks/scroll-expansion-hero';

interface MediaContent {
  src: string;
  poster?: string;
  background: string;
  title: string;
  date: string;
  scrollToExpand: string;
}

interface MediaContentCollection {
  [key: string]: MediaContent;
}

const sampleMediaContent: MediaContentCollection = {
  video: {
    src: 'https://sih-swaraj.s3.ap-south-2.amazonaws.com/public-media/Adobe+Express+-+Man_Reports_Broken_Lamp_Via_App.mp4',
    background:
      'https://sih-swaraj.s3.ap-south-2.amazonaws.com/public-media/hero-bg-swaraj.png',
    title: 'SwarajDesk',
    date: 'Voice your issue',
    scrollToExpand: 'Scroll',
  },
};

const Demo = () => {
  const mediaType = 'video';
  const currentMedia = sampleMediaContent[mediaType];

  useEffect(() => {
    window.scrollTo(0, 0);

    const resetEvent = new Event('resetSection');
    window.dispatchEvent(resetEvent);
  }, []);

  return (
    <div className='min-h-screen overflow-hidden'>
      <ScrollExpandMedia
        mediaType={mediaType}
        mediaSrc={currentMedia.src}
        posterSrc={currentMedia.poster}
        bgImageSrc={currentMedia.background}
        title={currentMedia.title}
        date={currentMedia.date}
        scrollToExpand={currentMedia.scrollToExpand}
      />
    </div>
  );
};

export default Demo;

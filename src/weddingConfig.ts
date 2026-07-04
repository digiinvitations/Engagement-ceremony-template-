/**
 * Royal Hindu Wedding E-Invitation Configuration Object
 * Easily customize any aspect of the wedding invitation here!
 */



export interface WeddingConfig {
  openingBackgroundImageUrl: string;
  openingSealImageUrl: string;
  openingVideoUrl: string;
  bride: {
    name: string;
    fatherName: string;
    motherName: string;
    imageUrl: string;
    bio: string;
  };
  groom: {
    name: string;
    fatherName: string;
    motherName: string;
    imageUrl: string;
    bio: string;
  };
  weddingDate: string; // For countdown (ISO format: YYYY-MM-DDTHH:mm:ss)
  displayDate: string; // Human readable e.g., "Saturday, December 12, 2026"
  hashtag: string; // e.g. #AaravKiAnanya
  musicUrl: string; // Audio URL (Shehnai / Sitar instrumental)
  youtubeEmbedUrl: string; // YouTube video embed link
  envelopeIconUrl?: string; // Optional custom envelope icon
  thankYouImageUrl?: string; // Optional custom thank you portrait
  heroTagline: string;
  heroSettings: {
    shloka: string;
    introText: string;
    brideParents: string;
    groomParents: string;
    showPetals: boolean;
    ganeshaIconUrl?: string;
  };
  gallerySubtitle: string;
  galleryImages: {
    url: string;
    caption: string;
  }[];

  engagementDetails: {
    venueName: string;
    venueAddress: string;
    time: string;
    mapEmbedUrl: string;
    mapDirectionsUrl: string;
  };
  socialLinks: {
    facebook: string;
    instagram: string;
  };
  familyDetails: {
    message: string;
    welcomingText: string;
    names: string[];
  };
  welcomeMessage: {
    title: string;
    subtitle: string;
    text: string;
  };
}

export const weddingConfig: WeddingConfig = {
  openingBackgroundImageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=100&w=3840&auto=format&fit=crop",
  openingSealImageUrl: "https://i.ibb.co/3s4y6Z2/seal.png",
  openingVideoUrl: "",
  bride: {
    name: "Meenal",
    fatherName: "Shri Devendra Sharma",
    motherName: "Smt. Sunita Sharma",
    imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=800&auto=format&fit=crop",
    bio: "A beautiful soul, traditional yet modern, Ananya brings joy and light to everyone around her. She loves classical art, painting, and is the beloved daughter of the Sharma family."
  },
  groom: {
    name: "Avinash",
    fatherName: "Shri Rajesh Patel",
    motherName: "Smt. Manju Patel",
    imageUrl: "https://images.unsplash.com/photo-1594191632832-7da2260682fa?q=80&w=800&auto=format&fit=crop",
    bio: "A visionary tech leader with a warm heart, Aarav is known for his humility and wisdom. He enjoys photography, travelling, and is the proud son of the Singhal family."
  },
  weddingDate: "2026-12-12T18:30:00", // Year-Month-Day-Time (for countdown)
  displayDate: "12th December 2026",
  hashtag: "#MeenalAndAvinash",
  heroTagline: "We Are Engaged",
  heroSettings: {
    shloka: "॥ श्री गणेशाय नमः ॥\nवक्रतुण्ड महाकाय सूर्यकोटि समप्रभ\nनिर्विघ्नं कुरु मे देव\nसर्वकार्येषु सर्वदा ॥",
    introText: "With the blessings of Shri Ganesh and our beloved families, we joyfully invite you to celebrate the union of",
    brideParents: "Daughter of Mr. & Mrs. Sharma",
    groomParents: "Son of Mr. & Mrs. Patel",
    showPetals: true,
    ganeshaIconUrl: "",
  },
  // A beautiful, soothing, royalty-free Indian bansuri/flute melody
  musicUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
  youtubeEmbedUrl: "https://www.youtube.com/embed/N4YdD_19F0Y", // Indian wedding highlight placeholder
  envelopeIconUrl: "",
  thankYouImageUrl: "",
  gallerySubtitle: "Glimpses of Our Journey",
  galleryImages: [
    {
      url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800",
      caption: "Eternal Togetherness"
    },
    {
      url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800",
      caption: "Hand in Hand"
    },
    {
      url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800",
      caption: "Floral Celebrations"
    },
    {
      url: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=800",
      caption: "The Promise"
    }
  ],
  engagementDetails: {
    time: "07:00 PM onwards",
    venueName: "The Sapphire Crystal Hall, Taj Palace Hotel",
    venueAddress: "VIP Road, Colaba, Mumbai, MH - 400001",
    mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3773.8402170362376!2d72.8308413!3d18.9219841!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7d1c73a0d5cad%3A0xc70a25a7209c733c!2sTaj%20Mahal%20Tower%2C%20Mumbai!5e0!3m2!1sen!2sin!4v1680000000000!5m2!1sen!2sin",
    mapDirectionsUrl: "https://maps.google.com/?q=Taj+Mahal+Tower+Mumbai"
  },
  socialLinks: {
    facebook: "https://facebook.com",
    instagram: "https://instagram.com"
  },
  familyDetails: {
    message: "With the divine blessings of Lord Ganesha and our ancestors, we cordially invite you and your family to grace our Engagement Ceremony.",
    welcomingText: "Warmly Welcomed By:",
    names: [
      "Singhal Family",
      "Sharma Family",
      "All Relatives and Friends"
    ]
  },
  welcomeMessage: {
    title: "Two Hearts, One Journey",
    subtitle: "We invite you to celebrate our love",
    text: "Because you have played a very special role in our lives, we would love for you to join us as we embark on this beautiful adventure together. Together with our families, we invite you to share our joy and laughter at our Engagement Ceremony."
  }
};

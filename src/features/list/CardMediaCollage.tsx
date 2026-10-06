import React from "react";
import type { Entry, MediaRef, MoodData, SongAttachment } from "../../types";
import { AttachmentCollage } from "../entries/AttachmentCollage";

interface CardMediaCollageProps {
  mood?: MoodData | null;
  mediaRefs?: MediaRef[];
  songs?: SongAttachment[];
  entryDate: number;
  location?: Entry["location"];
  attachmentOrder?: Entry["attachmentOrder"];
  coverThumb?: string | null;
  onPhotoClick?: (index: number) => void;
}

export const CardMediaCollage: React.FC<CardMediaCollageProps> = ({
  mood,
  mediaRefs = [],
  songs = [],
  entryDate,
  location,
  attachmentOrder,
  coverThumb,
  onPhotoClick,
}) => {
  return (
    <AttachmentCollage
      entry={{
        mood: mood || null,
        media: mediaRefs,
        songs,
        location: location || null,
        attachmentOrder,
        entryDate,
        coverThumb,
      }}
      onPhotoClick={onPhotoClick}
    />
  );
};

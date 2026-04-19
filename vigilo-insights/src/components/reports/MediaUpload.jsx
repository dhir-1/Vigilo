import { useState } from "react";
import { Upload, X, Image, Video } from "lucide-react";

export function MediaUpload({ onPhotosChange, onVideoChange, maxPhotos = 3, maxVideos = 1 }) {
  const [photos, setPhotos] = useState([]);
  const [video, setVideo] = useState(null);

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    const newPhotos = files.slice(0, maxPhotos - photos.length).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }));
    const updated = [...photos, ...newPhotos];
    setPhotos(updated);
    onPhotosChange?.(updated);
  };

  const removePhoto = (index) => {
    const updated = photos.filter((_, i) => i !== index);
    setPhotos(updated);
    onPhotosChange?.(updated);
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const v = { file, preview: URL.createObjectURL(file), name: file.name };
      setVideo(v);
      onVideoChange?.(v);
    }
  };

  const removeVideo = () => {
    setVideo(null);
    onVideoChange?.(null);
  };

  return (
    <div className="space-y-4">
      {/* Photo Upload */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Photos (max {maxPhotos})
        </label>
        <div className="flex flex-wrap gap-3">
          {photos.map((photo, i) => (
            <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border group">
              <img src={photo.preview} alt={photo.name} className="w-full h-full object-cover" />
              <button
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {photos.length < maxPhotos && (
            <label className="w-24 h-24 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
              <Image size={20} className="text-muted-foreground mb-1" />
              <span className="text-[10px] text-muted-foreground">Add Photo</span>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} multiple />
            </label>
          )}
        </div>
      </div>

      {/* Video Upload */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Video (max {maxVideos})
        </label>
        {video ? (
          <div className="relative rounded-xl overflow-hidden border border-border p-3 flex items-center gap-3 bg-muted/30">
            <Video size={20} className="text-primary" />
            <span className="text-sm text-foreground truncate flex-1">{video.name}</span>
            <button
              onClick={removeVideo}
              className="w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
            <Upload size={20} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Upload video evidence</span>
            <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
          </label>
        )}
      </div>
    </div>
  );
}

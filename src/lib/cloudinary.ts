const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export async function uploadImage(file: File | Blob, folder = "asktask"): Promise<string> {
  const form = new FormData();
  // If it's a plain Blob (e.g. from canvas crop), wrap it as a File so Cloudinary gets a filename
  const uploadable = file instanceof File ? file : new File([file], "photo.jpg", { type: file.type || "image/jpeg" });
  form.append("file", uploadable);
  form.append("upload_preset", UPLOAD_PRESET);
  form.append("folder", folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) throw new Error("Image upload failed");
  const data = await res.json();
  return data.secure_url as string;
}

export async function uploadImages(files: File[], folder = "asktask"): Promise<string[]> {
  return Promise.all(files.map((f) => uploadImage(f, folder)));
}

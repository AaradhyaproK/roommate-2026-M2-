import axios from 'axios';

const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY;

export const uploadImageToImgBB = async (file: File): Promise<string> => {
  if (!IMGBB_API_KEY) {
    throw new Error('ImgBB API key is missing. Please check your .env.local file.');
  }

  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await axios.post(
      `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
      formData
    );

    return response.data.data.url;
  } catch (error) {
    console.error('Error uploading to ImgBB:', error);
    throw new Error('Failed to upload image');
  }
};
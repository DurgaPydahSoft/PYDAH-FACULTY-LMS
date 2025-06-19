const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');

// Debug environment variables
console.log('AWS Configuration:', {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Not Set',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Not Set',
  region: process.env.AWS_REGION,
  bucket: process.env.AWS_S3_BUCKET
});

// Validate required environment variables
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION || !process.env.AWS_S3_BUCKET) {
  throw new Error('Missing required AWS environment variables. Please check your .env file.');
}

// Configure AWS S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Configure multer for S3 upload
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `profile-pictures/${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and JPG are allowed.'));
    }
  }
});

// Function to delete old profile picture from S3
const deleteProfilePicture = async (imageUrl) => {
  if (!imageUrl) return;

  try {
    const key = imageUrl.split('/').slice(-2).join('/'); // Get the key from the URL
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    }));
  } catch (error) {
    console.error('Error deleting old profile picture:', error);
  }
};

module.exports = {
  upload,
  deleteProfilePicture
}; 
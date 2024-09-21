import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_APT_SECRET, 
});


const uploadOnCloudinary =async (localFilePath) =>{

    try {
        if (!localFilePath) {
            return null;
        }
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath ,{
            resource_type : "auto"
        })
        

        // file has been uploaded successfully
        // console.log("File Is Uploaded On Cloudinary" , response.url);
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file
        return response;
        
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
        
    }
}

const deleteFromCloudinary = async (publicId) => {
    try {
        const response = await cloudinary.uploader.destroy(publicId);
        if(response.result !== "ok"){
            throw new Error("Failed to delete image from Cloudinary");
        }
                
        return true;
        
    } catch (error) {
        console.error("Error deleting avatar from Cloudinary:", error.message);
        return false;
    }

}

export {uploadOnCloudinary , deleteFromCloudinary};
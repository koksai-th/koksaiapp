import { Geolocation } from "@capacitor/geolocation";
import { PushNotifications } from "@capacitor/push-notifications";


export async function setupAllPermissions(){

    const result = {
        location:false,
        notification:false,
        storage:false,
        microphone:false
    };


    // 1 Location
    try {

        const location =
        await Geolocation.requestPermissions();

        result.location =
        location.location === "granted";

    } catch(e){
        console.log(e);
    }



    // 2 Notification

    try {

        const notification =
        await PushNotifications.requestPermissions();

        if(notification.receive==="granted"){

            await PushNotifications.register();

            result.notification=true;
        }

    }catch(e){
        console.log(e);
    }



    // 3 Storage
    // ขอเฉพาะ Android ตอนแนบรูป
    result.storage=true;



    // 4 Microphone
    // ขอเมื่อเปิด Voice Chat
    result.microphone=true;



    return result;

}
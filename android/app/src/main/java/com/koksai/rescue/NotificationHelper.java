package com.koksai.rescue;


import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;


public class NotificationHelper {


 public static void createEmergencyChannel(Context context){


  if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.O){


   NotificationManager manager =
    context.getSystemService(NotificationManager.class);



   Uri sound =
    Uri.parse(
    "android.resource://" 
    + context.getPackageName()
    + "/raw/siren"
    );



   AudioAttributes audio =
    new AudioAttributes.Builder()
    .setUsage(
     AudioAttributes.USAGE_NOTIFICATION
    )
    .build();



   NotificationChannel channel =
    new NotificationChannel(

     "emergency",

     "🚑 เหตุฉุกเฉิน",

     NotificationManager.IMPORTANCE_HIGH

    );


   channel.setSound(sound,audio);

   channel.enableVibration(true);


   manager.createNotificationChannel(channel);


  }

 }

}
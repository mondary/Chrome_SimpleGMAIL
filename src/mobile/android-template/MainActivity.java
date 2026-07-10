package fr.simplemail.app;

import android.os.Bundle;
import android.view.MotionEvent;
import android.view.View;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final float SWIPE_DISTANCE_PX = 96f;
    private static final long SWIPE_DURATION_MS = 700L;

    private float touchStartX;
    private float touchStartY;
    private long touchStartedAt;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getBridge().getWebView().setOnTouchListener(this::handleMailSwipe);
    }

    private boolean handleMailSwipe(View view, MotionEvent event) {
        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                touchStartX = event.getX();
                touchStartY = event.getY();
                touchStartedAt = System.currentTimeMillis();
                break;
            case MotionEvent.ACTION_UP:
                float dx = event.getX() - touchStartX;
                float dy = event.getY() - touchStartY;
                boolean horizontal = Math.abs(dx) >= SWIPE_DISTANCE_PX
                    && Math.abs(dx) > Math.abs(dy) * 1.5f
                    && System.currentTimeMillis() - touchStartedAt < SWIPE_DURATION_MS;
                if (horizontal) {
                    int direction = dx < 0 ? 1 : -1;
                    getBridge().getWebView().evaluateJavascript(
                        "window.__simpleMailNativeSwipe=true;"
                            + "if(typeof navigateMail==='function'){navigateMail(" + direction + ");}",
                        null
                    );
                }
                break;
            default:
                break;
        }
        return false;
    }
}

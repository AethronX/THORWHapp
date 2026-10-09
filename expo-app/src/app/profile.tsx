import { router, Stack } from 'expo-router';

import { useAppState, useController, useUi } from '../ui/AppContext';
import { runGuarded } from '../ui/components';
import { Quiz } from '../ui/Quiz';

/** Settings → "My plan & answers": retake the questionnaire. */
export default function ProfileScreen() {
  const st = useAppState();
  const c = useController();
  const { s } = useUi();
  return (
    <>
      <Stack.Screen options={{ title: s.yourPlan }} />
      <Quiz
        initial={st.profile}
        onDone={async (p) => {
          if (p) await runGuarded(() => c.setProfile(p), s.errGeneric);
          router.back();
        }}
      />
    </>
  );
}

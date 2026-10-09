import { Pressable, Image, Text, View } from 'react-native';

export function Header({ onBack, onSave }: { onBack: () => void; onSave: () => void }) {
  return (
    <View>
      {/* expect: rn-touchable-name rn-touchable-role */}
      <Pressable onPress={onBack}><Image source={require('./back.png')} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack}><Image source={require('./back.png')} /></Pressable>
      {/* expect: rn-touchable-role */}
      <Pressable onPress={onSave}><Text>Save</Text></Pressable>
      <Pressable role="button" onPress={onSave}><Text>Save</Text></Pressable>
    </View>
  );
}

export function PostCard({ id, title }: { id: string; title: string }) {
  return (
    <Link asChild href={{ pathname: '/post/[id]', params: { id } }}>
      <Pressable><Text>{title}</Text></Pressable>
    </Link>
  );
}

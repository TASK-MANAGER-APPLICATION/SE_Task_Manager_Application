import { Link, Slot, usePathname } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function AppTabsWeb() {
  const pathname = usePathname();

  const isHome = pathname === '/home' || pathname === '/';
  const isExplore = pathname === '/explore';

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brand}>Task Manager</Text>

          <View style={styles.navigation}>
            <Link href="/home" style={styles.link}>
              <Text style={[styles.linkText, isHome && styles.activeText]}>
                Home
              </Text>
            </Link>

            <Link href="/explore" style={styles.link}>
              <Text
                style={[
                  styles.linkText,
                  isExplore && styles.activeText,
                ]}
              >
                Explore
              </Text>
            </Link>
          </View>
        </View>
      </View>
      <Slot />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
  },

  container: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },

  header: {
    minHeight: 64,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  brand: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },

  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },

  link: {
    textDecorationLine: 'none',
  },

  linkText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },

  activeText: {
    color: '#111827',
    fontWeight: '700',
  },
});

export type PreferenceField = 'headline' | 'subheadline' | 'description' | 'cta';

export interface UserEditPreference {
  userId: string;
  category: string;
  field: PreferenceField;
  originalValue: string;
  editedValue: string;
  createdAt: Date;
}

export interface RecordPreferenceInput {
  userId: string;
  category: string;
  field: PreferenceField;
  originalValue: string;
  editedValue: string;
}

const preferences: UserEditPreference[] = [];

export class UserPreferenceEngine {
  recordEdit(input: RecordPreferenceInput): UserEditPreference {
    const preference: UserEditPreference = {
      ...input,
      createdAt: new Date(),
    };

    preferences.push(preference);
    return preference;
  }

  recordEdits(inputs: RecordPreferenceInput[]): UserEditPreference[] {
    return inputs.map((input) => this.recordEdit(input));
  }

  getUserPreferences(userId: string): UserEditPreference[] {
    return preferences.filter((preference) => preference.userId === userId);
  }

  getUserCategoryPreferences(userId: string, category: string): UserEditPreference[] {
    return preferences.filter(
      (preference) =>
        preference.userId === userId &&
        preference.category.toLowerCase() === category.toLowerCase()
    );
  }

  clearUser(userId: string): void {
    for (let index = preferences.length - 1; index >= 0; index -= 1) {
      if (preferences[index]?.userId === userId) preferences.splice(index, 1);
    }
  }

  clearAll(): void {
    preferences.splice(0, preferences.length);
  }
}

export default UserPreferenceEngine;

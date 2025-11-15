"""
Script to create a sample migraine_prediction.xlsx file with realistic clinical features.
"""
import pandas as pd

# Create sample migraine prediction data
data = {
    'category': [
        'Sleep', 'Sleep', 'Sleep',
        'Stress', 'Stress', 'Stress',
        'Diet', 'Diet', 'Diet',
        'Physical', 'Physical', 'Physical',
        'Environmental', 'Environmental', 'Environmental',
        'Hormonal', 'Hormonal',
        'Lifestyle', 'Lifestyle', 'Lifestyle'
    ],
    'variable': [
        'Sleep Duration (hours)', 'Sleep Quality (1-10)', 'Sleep Consistency Score',
        'Stress Level (1-10)', 'Work Hours', 'Anxiety Score (1-10)',
        'Caffeine Intake (mg)', 'Water Intake (L)', 'Meal Regularity (1-10)',
        'Exercise Duration (min)', 'Physical Activity Level (1-10)', 'Neck Tension (1-10)',
        'Screen Time (hours)', 'Weather Pressure (hPa)', 'Noise Level (dB)',
        'Hormone Fluctuation Index', 'Menstrual Cycle Day',
        'Alcohol Consumption (units)', 'Smoking (cigarettes/day)', 'Meditation Time (min)'
    ],
    'Description': [
        'Average hours of sleep per night', 'Self-reported sleep quality', 'Consistency of sleep schedule',
        'Self-reported stress level', 'Hours worked per day', 'Anxiety severity score',
        'Daily caffeine consumption', 'Daily water intake', 'Regularity of meal times',
        'Minutes of exercise per day', 'Overall physical activity level', 'Neck and shoulder tension',
        'Daily screen time', 'Atmospheric pressure', 'Environmental noise exposure',
        'Hormonal variation index', 'Day of menstrual cycle',
        'Alcoholic drinks per day', 'Cigarettes smoked per day', 'Daily meditation duration'
    ],
    'Weight': [
        0.85, 0.80, 0.70,
        0.90, 0.75, 0.80,
        0.65, 0.55, 0.60,
        0.60, 0.55, 0.75,
        0.70, 0.60, 0.50,
        0.85, 0.75,
        0.50, 0.45, 0.40
    ],
    'min': [
        4, 1, 1,
        1, 4, 1,
        0, 0.5, 1,
        0, 1, 1,
        2, 980, 30,
        0, 1,
        0, 0, 0
    ],
    'max': [
        10, 10, 10,
        10, 16, 10,
        800, 4, 10,
        120, 10, 10,
        16, 1040, 90,
        10, 28,
        10, 40, 60
    ],
    'mean': [
        7.0, 6.5, 6.0,
        6.0, 8.5, 5.5,
        200, 2.0, 6.5,
        30, 5.5, 4.5,
        8, 1013, 55,
        5.0, 14,
        2, 5, 15
    ],
    'std': [
        1.2, 1.8, 1.5,
        2.0, 2.0, 2.2,
        150, 0.8, 2.0,
        25, 2.0, 2.5,
        3, 15, 12,
        2.5, 8,
        2.5, 8, 15
    ],
    'Normalized range (1-10)': [
        '4-10', '1-10', '1-10',
        '1-10', '4-16 (normalized)', '1-10',
        '0-800 (normalized)', '0.5-4 (normalized)', '1-10',
        '0-120 (normalized)', '1-10', '1-10',
        '2-16 (normalized)', '980-1040 (normalized)', '30-90 (normalized)',
        '0-10', '1-28',
        '0-10', '0-40', '0-60 (normalized)'
    ],
    'Migraine impact pattern': [
        'Low sleep increases risk', 'Poor quality increases risk', 'Irregular schedule increases risk',
        'High stress increases risk', 'Overwork increases risk', 'High anxiety increases risk',
        'Excess caffeine triggers', 'Dehydration triggers', 'Irregular meals trigger',
        'Low activity increases risk', 'Sedentary lifestyle increases risk', 'High tension triggers',
        'Excessive screen time triggers', 'Pressure changes trigger', 'High noise triggers',
        'Fluctuations trigger', 'Certain phases trigger',
        'Excess alcohol triggers', 'Smoking increases risk', 'Low meditation increases risk'
    ]
}

df = pd.DataFrame(data)

# Calculate relevance from weight (normalized 0-1)
df['relevance'] = df['Weight']

# Save to Excel
output_path = 'migraine_prediction.xlsx'
df.to_excel(output_path, index=False)
print(f"Created {output_path} with {len(df)} features")
print(f"\nColumns: {list(df.columns)}")
print(f"\nCategories: {df['category'].unique()}")

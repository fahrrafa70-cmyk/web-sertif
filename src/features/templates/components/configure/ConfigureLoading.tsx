

interface ConfigureLoadingProps {
  t: (key: string) => string;
}

export function ConfigureLoading({ t }: ConfigureLoadingProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">{t('configure.loading')}</p>
      </div>
    </div>
  );
}

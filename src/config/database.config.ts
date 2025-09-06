import { ConfigService } from '@nestjs/config';

export const databaseConfig = (configService: ConfigService) => ({
  uri: configService.get<string>('MONGO_URI'),
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

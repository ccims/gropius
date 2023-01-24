FROM gradle:jdk17
WORKDIR /home/gradle/gropius-backend
ADD . .
ARG module
RUN gradle clean ${module}:build

FROM eclipse-temurin:17
ARG module
WORKDIR /home/java
COPY --from=0 /home/gradle/gropius-backend/${module}/build/libs/*.jar app.jar
CMD java -jar ./app.jar
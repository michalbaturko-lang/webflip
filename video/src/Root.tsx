import { Composition } from "remotion";
import { OutreachVideo } from "./Video";

export const RemotionRoot = () => {
  return (
    <Composition
      id="OutreachVideo"
      component={OutreachVideo}
      durationInFrames={1860}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        companyName: "Vaše firma",
        companyDomain: "vasefirma.cz",
        overallScore: 42,
      }}
    />
  );
};

import Gallery from "../components/Gallery";
import { getPhotos } from "../lib/photos";

export default function Home() {
  const photos = getPhotos();

  return <Gallery photos={photos} />;
}

export default function PostPage({ params }: { params: string }) {

  return (
    <div>
      Post Page {JSON.stringify(params)}
    </div>
  )
}